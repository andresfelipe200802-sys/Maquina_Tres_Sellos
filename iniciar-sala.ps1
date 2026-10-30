<#
.SYNOPSIS
  Inicia la sala completa sin subir el backend a ningún servicio en la nube.

.DESCRIPTION
  1. Arranca el backend Node/WebSocket de la sala (puerto 3001 por defecto).
  2. Lo expone por un túnel HTTPS gratuito de Cloudflare (trycloudflare.com).
  3. Imprime y copia al portapapeles la URL pública del API.

  Esa URL va en la variable de repositorio VITE_API_URL de GitHub, y el
  workflow de Pages reconstruye el frontend con el modo sala activo.

  El código y los datos permanecen en esta PC. Cloudflare solo reenvía el
  tráfico por HTTPS; no se abren puertos del router y no se publica el
  backend en ningún proveedor.

.NOTES
  Requisitos:
    - Node.js instalado
    - cloudflared instalado:  winget install --id Cloudflare.cloudflared -e
    - MySQL corriendo si server/.env define DATABASE_URL; si no, usa -Memoria

.EXAMPLE
  .\iniciar-sala.ps1

.EXAMPLE
  .\iniciar-sala.ps1 -Memoria

.EXAMPLE
  .\iniciar-sala.ps1 -Puerto 3002 -OrigenPages 'https://otro-usuario.github.io'

.EXAMPLE
  .\iniciar-sala.ps1 -Probar
#>
[CmdletBinding()]
param(
  [int]$Puerto = 3001,
  [string]$OrigenPages = 'https://andresfelipe200802-sys.github.io',
  [switch]$Memoria,
  [switch]$Probar
)

$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot
# Siempre IPv4 de loopback: el backend solo escucha en 127.0.0.1 y "localhost"
# puede resolver primero a ::1 (IPv6), que quedaría sin atender.
$baseUrl = "http://127.0.0.1:$Puerto"
$healthUrl = "$baseUrl/health"
# TEMP puede venir en formato 8.3 (C:\Users\NOMBR~1\...) y Remove-Item falla
# con esas rutas: se normaliza a nombre largo antes de usarlas.
$dirTemp = (Get-Item -LiteralPath $env:TEMP).FullName
$errLog = Join-Path $dirTemp 'sena-tunnel.err.log'
$outLog = Join-Path $dirTemp 'sena-tunnel.out.log'
$inLog = Join-Path $dirTemp 'sena-tunnel.in.txt'
$backend = $null
$tunel = $null

# Refresca el PATH para ver programas instalados por winget en esta misma sesión.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [Environment]::GetEnvironmentVariable('Path', 'User')

function Obtener-Cloudflared {
  $comando = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($comando) { return $comando.Source }
  foreach ($ruta in @(
      'C:\Program Files (x86)\cloudflared\cloudflared.exe',
      'C:\Program Files\cloudflared\cloudflared.exe'
    )) {
    if (Test-Path $ruta) { return $ruta }
  }
  return $null
}

function Detener-Servicios {
  # Cualquier error de esta función debe ignorarse: su propósito es terminar
  # los procesos y borrar archivos temporales sin abortar el script.
  $ErrorActionPreference = 'Continue'
  if ($script:tunel -and -not $script:tunel.HasExited) {
    Stop-Process -Id $script:tunel.Id -Force -ErrorAction SilentlyContinue
  }
  if ($script:backend -and -not $script:backend.HasExited) {
    # Matar el árbol completo: npm -> tsx -> node
    taskkill /PID $script:backend.Id /T /F 2>$null | Out-Null
  }
  # Pausa para que los procesos asesinados liberen los manejadores de archivos.
  Start-Sleep -Milliseconds 1500
  foreach ($archivo in @($script:errLog, $script:outLog, $script:inLog)) {
    if ([string]::IsNullOrWhiteSpace([string]$archivo)) { continue }
    if (Test-Path -LiteralPath ([string]$archivo) -ErrorAction SilentlyContinue) {
      try {
        Remove-Item -LiteralPath ([string]$archivo) -Force -ErrorAction Stop
      } catch {
        # Archivo aún bloqueado o ya eliminado: no es un error crítico.
      }
    }
  }
}

try {
  Write-Host '=== SALA SENA · Backend + Túnel Cloudflare ===' -ForegroundColor Cyan
  Write-Host ''

  # --- 1. Requisitos -------------------------------------------------------
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'No se encontró Node.js. Instálalo desde https://nodejs.org' -ForegroundColor Red
    exit 1
  }

  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'No se encontró npm. Revisa la instalación de Node.js.' -ForegroundColor Red
    exit 1
  }

  $rutaCloudflared = Obtener-Cloudflared
  if (-not $rutaCloudflared) {
    Write-Host 'No se encontró cloudflared. Instálalo con esta orden y vuelve a ejecutar:' -ForegroundColor Red
    Write-Host '  winget install --id Cloudflare.cloudflared -e' -ForegroundColor Yellow
    exit 1
  }

  # --- 2. Puerto libre -----------------------------------------------------
  $ocupado = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($ocupado) {
    Write-Host "El puerto $Puerto ya está en uso (PID $($ocupado.OwningProcess))." -ForegroundColor Red
    Write-Host 'Cierra ese proceso o ejecuta con otro puerto: .\iniciar-sala.ps1 -Puerto 3002' -ForegroundColor Yellow
    exit 1
  }

  # --- 3. Avisos de configuración -----------------------------------------
  $rutaEnv = Join-Path $raiz 'server\.env'
  if (Test-Path $rutaEnv) {
    $contenido = Get-Content $rutaEnv -Raw
    if ($contenido -match 'INSTRUCTOR_PASSWORD=SENA2026\*') {
      Write-Host 'AVISO: server/.env todavía usa la contraseña de ejemplo SENA2026*.' -ForegroundColor Yellow
      Write-Host '       Cámbiala antes de compartir el link con estudiantes.' -ForegroundColor Yellow
    }
  }

  if ($Memoria) {
    # dotenv no pisa variables ya definidas: al definirla con un espacio en
    # blanco, el servidor la interpreta como vacía y queda en memoria.
    $env:DATABASE_URL = ' '
    Write-Host 'Modo memoria: sin MySQL. Las rondas se pierden al detener el script.' -ForegroundColor Yellow
  }

  # --- 4. CORS y puerto: el navegador llegará desde GitHub Pages ------------
  $env:CLIENT_ORIGINS = @($OrigenPages, 'http://localhost:5173', 'http://localhost:4173') -join ','
  $env:PORT = [string]$Puerto

  # --- 5. Backend ----------------------------------------------------------
  Write-Host "Arrancando backend en el puerto $Puerto..." -ForegroundColor Cyan
  # tsx watch se reinicia con la tecla Enter: se le redirige stdin a un archivo
  # vacío para que la consola compartida no lo interrumpa.
  Set-Content -Path $inLog -Value '' -NoNewline
  $backend = Start-Process -FilePath 'powershell' -PassThru -NoNewWindow -ArgumentList @(
    '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    "Set-Location '$raiz'; npm --prefix server run dev"
  ) -RedirectStandardInput $inLog

  $listo = $false
  $ultimoError = ''
  for ($intento = 1; $intento -le 40; $intento++) {
    Start-Sleep -Milliseconds 750
    try {
      $respuesta = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
      if ($respuesta.StatusCode -eq 200) {
        $listo = $true
        break
      }
    } catch {
      # El backend aún está compilando; se reintenta y se guarda el detalle.
      $ultimoError = $_.Exception.Message
    }
  }

  if (-not $listo) {
    Write-Host "El backend no respondió en $healthUrl." -ForegroundColor Red
    if ($ultimoError) { Write-Host "Último detalle: $ultimoError" -ForegroundColor Yellow }
    Write-Host 'Revisa los logs de arriba. Si usas MySQL, asegúrate de que el servicio' -ForegroundColor Yellow
    Write-Host 'esté corriendo o vuelve a ejecutar con -Memoria.' -ForegroundColor Yellow
    exit 1
  }

  $estado = (Invoke-WebRequest -UseBasicParsing -Uri $healthUrl).Content
  Write-Host "Backend OK · $estado" -ForegroundColor Green

  # --- 6. Túnel de Cloudflare ---------------------------------------------
  Write-Host 'Abriendo túnel HTTPS de Cloudflare...' -ForegroundColor Cyan
  foreach ($archivo in @($errLog, $outLog)) {
    if (Test-Path -LiteralPath $archivo -ErrorAction SilentlyContinue) {
      Remove-Item -LiteralPath $archivo -Force -ErrorAction SilentlyContinue
    }
  }
  $tunel = Start-Process -FilePath $rutaCloudflared -PassThru -NoNewWindow -ArgumentList @(
    'tunnel', '--url', $baseUrl
  ) -RedirectStandardError $errLog -RedirectStandardOutput $outLog

  $url = $null
  for ($intento = 1; $intento -le 80 -and -not $url; $intento++) {
    Start-Sleep -Milliseconds 500
    foreach ($archivo in @($errLog, $outLog)) {
      if (-not (Test-Path $archivo)) { continue }
      $texto = Get-Content $archivo -Raw -ErrorAction SilentlyContinue
      if ($texto -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $url = $Matches[0]
        break
      }
    }
  }

  if (-not $url) {
    Write-Host 'No se pudo obtener la URL del túnel. Último registro:' -ForegroundColor Red
    if (Test-Path $errLog) {
      Get-Content $errLog -Tail 15 | ForEach-Object { Write-Host $_ }
    }
    exit 1
  }

  try { Set-Clipboard -Value $url } catch { }

  # --- 7. Auto-prueba del túnel y CORS (-Probar) ---------------------------
  if ($Probar) {
    Write-Host ''
    Write-Host '=== AUTO-PRUEBA ===' -ForegroundColor Magenta
    # El subdominio efímero de trycloudflare tarda en aparecer en DNS (a veces
    # llega primero AAAA y luego A), y un primer fallo deja caché negativa:
    # se purga la caché en cada intento y se espera hasta 2 minutos.
    $respuestaPrueba = $null
    for ($intento = 1; $intento -le 12 -and -not $respuestaPrueba; $intento++) {
      Clear-DnsClientCache -ErrorAction SilentlyContinue
      try {
        $respuestaPrueba = Invoke-WebRequest -UseBasicParsing -Uri "$url/health" `
          -Headers @{ Origin = $OrigenPages } -TimeoutSec 20
      } catch {
        $restante = 12 - $intento
        if ($restante -gt 0) {
          Write-Host "  Intento $intento/12: DNS aún no resuelve el túnel. Reintento en 10 s..." -ForegroundColor Gray
          Start-Sleep -Seconds 10
        }
      }
    }

    if ($respuestaPrueba) {
      $destino = $respuestaPrueba.Headers['Access-Control-Allow-Origin']
      if ($respuestaPrueba.StatusCode -eq 200) {
        Write-Host "  GET $url/health -> 200 OK" -ForegroundColor Green
        Write-Host "  Respuesta: $($respuestaPrueba.Content)" -ForegroundColor Gray
      } else {
        Write-Host "  GET $url/health -> codigo HTTP $($respuestaPrueba.StatusCode)" -ForegroundColor Red
      }
      if ($destino -eq $OrigenPages) {
        Write-Host "  CORS con origen '$OrigenPages' -> aceptado" -ForegroundColor Green
      } else {
        Write-Host "  CORS con origen '$OrigenPages' -> rechazado (devolvio '$destino')" -ForegroundColor Red
      }
    } else {
      Write-Host '  La prueba externa fallo tras 12 intentos. Revisa tu conexion.' -ForegroundColor Red
    }
    Write-Host '=== FIN AUTO-PRUEBA ===' -ForegroundColor Magenta
  }

  # --- 8. Instrucciones ----------------------------------------------------
  Write-Host ''
  Write-Host '=== TÚNEL ACTIVO ===' -ForegroundColor Green
  Write-Host 'URL del API (copiada al portapapeles):' -ForegroundColor White
  Write-Host "  $url" -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'El backend y el túnel quedan abiertos. NO cierres esta ventana.' -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'PRIMERA VEZ — configura GitHub Pages:' -ForegroundColor Magenta
  Write-Host '  1. Abre https://github.com/andresfelipe200802-sys/Maquina_Tres_Sellos/settings/variables/actions'
  Write-Host '  2. New repository variable:'
  Write-Host '       Name:  VITE_API_URL'
  Write-Host "       Value: $url"
  Write-Host '  3. Abre https://github.com/andresfelipe200802-sys/Maquina_Tres_Sellos/actions/workflows/pages.yml'
  Write-Host '  4. Run workflow sobre main y espera a que terminen build y deploy.'
  Write-Host '  5. Abre en el celular (incógnito): https://andresfelipe200802-sys.github.io/Maquina_Tres_Sellos/'
  Write-Host ''
  Write-Host 'PROXIMAS VECES — si la URL cambió, repite solo los pasos 2, 3 y 4.' -ForegroundColor Magenta
  Write-Host 'PANEL DEL PROFESOR:' -ForegroundColor White
  Write-Host '  https://andresfelipe200802-sys.github.io/Maquina_Tres_Sellos/instructor/' -ForegroundColor White
  Write-Host ''

  if ($Probar) {
    # En modo prueba no se espera: se detiene todo automáticamente.
    Write-Host 'Modo -Probar: se detiene el backend y el túnel automáticamente.' -ForegroundColor Gray
  } else {
    $null = Read-Host 'Presiona ENTER para detener el backend y el túnel'
  }
} finally {
  Detener-Servicios
  Write-Host ''
  Write-Host 'Servicios detenidos.' -ForegroundColor Green
}
