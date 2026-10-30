# Guía paso a paso para ejecutar la sala completa

> **Objetivo:** que el link de GitHub Pages muestre la sala completa —juego, sala de espera y panel del instructor— funcionando de verdad, con el backend corriendo en **tu PC** y expuesto a internet por un túnel HTTPS de Cloudflare (sin subir nada a Render ni a otro servicio en la nube).

---

## 1. Cómo funciona (30 segundos para entenderlo)

```
   CELULARES DE LOS ALUMNOS (navegador)
        │
        ├──► GitHub Pages ────────────────────── sirve HTML/JS/CSS (archivos estáticos)
        │     (nunca cambia de link)
        │
        └──► https://xxx-yyy-zzz.trycloudflare.com ──► API + WebSocket
                       ▲
                       │ túnel saliente desde tu PC
                       │ (NO abre puertos del router)
        TU PC ─────────┘
        backend Node en http://localhost:3001 + MySQL + contraseña del instructor
```

- **GitHub Pages** solo sirve archivos; **nunca** ejecuta el servidor. Por eso, sin la URL del túnel, el link muestra el juego pero la sala no arranca.
- **Tu PC** ejecuta el backend con `iniciar-sala.bat`.
- **Cloudflare** expone ese backend con una URL pública nueva que empieza con `https://` y termina con `.trycloudflare.com`.
- Esa URL se pega **una sola vez en GitHub** (variable `VITE_API_URL`) y Pages se recompila para que los celulares hablen con tu PC.

### Las 3 URLs que debes distinguir

| URL | ¿Dónde vive? | ¿Cambia? |
| :--- | :--- | :--- |
| `https://andresfelipe200802-sys.github.io/Maquina_Tres_Sellos/` | Link del juego para los alumnos | **Nunca** |
| `https://andresfelipe200802-sys.github.io/Maquina_Tres_Sellos/instructor/` | Tu panel del profesor | **Nunca** |
| `https://xxx-yyy-zzz.trycloudflare.com` | La URL del túnel: va en la variable `VITE_API_URL` de GitHub | **Cada vez que reinicias el script** |

---

## 2. Tabla de frecuencias (lo que preguntaste: ¿una sola vez o siempre?)

| Acción | ¿Cada cuánto? |
| :--- | :--- |
| Instalar `cloudflared` | **Una sola vez** (ya está instalado en esta PC) |
| Cambiar la contraseña del instructor en `server/.env` | **Una sola vez** |
| Crear la variable `VITE_API_URL` en GitHub | **Una sola vez** (después solo cambias su valor) |
| Ejecutar `iniciar-sala.bat` | **Siempre, cada clase/sesión** |
| Pegar la URL nueva en `VITE_API_URL` | **Solo si la URL cambió** (es decir, cada vez que reinicias el script) |
| Ejecutar el workflow de Pages | **Solo cuando cambió la URL** |
| Probar el link en incógnito | **Siempre, cada clase** (toma 30 segundos) |
| Mantener abierta la ventana del script | **Toda la clase** |
| Presionar ENTER en la ventana | **Al terminar la clase** |
| Abrir puertos en el router | **Nunca** (no hace falta) |

> **Regla de oro:** mientras la ventana del script **no se reinicie**, la URL sigue siendo la misma y **no tocas GitHub**. Si la reinicias → URL nueva → repites "pegar en GitHub + workflow".

---

## 3. PARTE A — UNA SOLA VEZ (primera configuración)

### A1. Instalar cloudflared (ya hecho en esta PC)

Solo si algún día cambias de computador:

```powershell
winget install --id Cloudflare.cloudflared -e
```

### A2. Cambiar la contraseña del instructor

1. Abre `server/.env` con el Bloc de notas.
2. Busca la línea `INSTRUCTOR_PASSWORD=` y pon una clave larga y única (ejemplo: algo que solo tú sepas, de 12+ caracteres).
3. Guarda el archivo.

🔒 La clave que hoy está en `server/.env` **ya no es la de ejemplo**: es personal y no debe aparecer en ningún documento, pantalla ni repositorio (`server/.env` sigue fuera de git). Si alguna vez se filtrara, cámbiala: el nuevo valor rige **desde el próximo inicio del script** (no hace falta nada más).

### A3. Encender el túnel y copiar la URL

1. Doble clic en **`iniciar-sala.bat`** (está en la carpeta del proyecto).
2. Espera a que aparezca:

   ```
   === TÚNEL ACTIVO ===
   URL del API (copiada al portapapeles):
     https://xxx-yyy-zzz.trycloudflare.com
   ```

3. La URL **ya está en tu portapapeles** (Ctrl+V la pega). **No cierres esa ventana.**

### A4. Crear la variable en GitHub (primera vez)

1. Abre: <https://github.com/andresfelipe200802-sys/Maquina_Tres_Sellos/settings/variables/actions>
2. Botón **New repository variable**:
   - **Name:** `VITE_API_URL`
   - **Value:** pega la URL con **Ctrl+V**
3. Botón **Add variable**.

### A5. Ejecutar el workflow de Pages

1. Abre: <https://github.com/andresfelipe200802-sys/Maquina_Tres_Sellos/actions/workflows/pages.yml>
2. A la derecha, **Run workflow** → elige `main` → botón verde **Run workflow**.
3. Espera a que las casillas **build** y **deploy** queden en verde (1–2 minutos).

### A6. Verificar en modo incógnito

1. Abre una ventana **incógnito/private** (Ctrl+Shift+N) y entra al link del juego: debe decir algo como *"Consultando el estado de la sala…"* y no debe caer al juego local de siempre.
2. Entra a tu panel `.../instructor/`, inicia sesión con usuario **`instructor`** y tu contraseña → debe mostrar **CONECTADO**, no *"SIN SEÑAL"*.
3. Comprueba además que Pages sirva con **GitHub Actions**: <https://github.com/andresfelipe200802-sys/Maquina_Tres_Sellos/settings/pages> → Source = **GitHub Actions** (si dice *Deploy from a branch*, cámbialo).

---

## 4. PARTE B — SIEMPRE, EN CADA CLASE (rutina)

1. **MySQL encendido** (solo si NO vas a usar `-Memoria`):

   ```powershell
   Get-Service *mysql*
   ```

   Si está detenido: `Iniciar-Servicio <nombre-del-servicio>` — o salta al paso 2 con `-Memoria`.

2. **Doble clic en `iniciar-sala.bat`.**

3. **Espera el bloque `=== TÚNEL ACTIVO ===`** (tarda ~10–40 segundos; la URL se copia sola al portapapeles).

4. **¿La URL cambió?** (Sí si reiniciaste el script; es la primera vez; o si dudas)
   - Abre la variable `VITE_API_URL` en GitHub → **Edit** → pega la nueva URL → **Update**.
   - Ve al workflow de Pages → **Run workflow** → espera el verde.

   **¿La URL NO cambió?** (el script sigue abierto desde antes) → no toques nada en GitHub.

5. **Prueba rápida en incógnito** los dos links (juego y panel). Si el juego no "conecta", recarga con **Ctrl+Shift+R** (puede quedar la versión vieja en caché).

6. **Deja la ventana del script abierta** durante toda la clase. Conviene evitar que la PC se duerma: *Configuración → Sistema → Alimentación → Dormir: **Nunca***.

7. **Al terminar:** presiona **ENTER** en la ventana del script → se apagan backend y túnel (`Servicios detenidos.`).

> **Opcional — autocomprobación:** si quieres que el script verifique solo que el túnel y el CORS funcionan, ejecútalo así desde PowerShell:
>
> ```powershell
> .\iniciar-sala.ps1 -Probar
> ```
>
> Espera hasta ~2 minutos, imprime `200 OK` + `CORS … aceptado` y se apaga solo. También puedes usar `-Memoria` (sin MySQL) o `-Puerto 3002` (si el 3001 está ocupado).

---

## 5. PARTE C — DURANTE LA CLASE

1. **Panel** `.../instructor/` → usuario `instructor` + contraseña → **AUTORIZAR SESIÓN** → debe indicar **CONECTADO**.
2. Botón **CREAR RONDA** (o **NUEVA RONDA** si ya hubo una).
3. **Alumnos:** abren el link del juego → escriben **NOMBRE Y APELLIDO** → **SOLICITAR ACCESO** → quedan en la **sala de espera**.
4. Cuando veas a todos (máx. 45 puestos) → **INICIAR RONDA**.
5. Monitorea la **MATRIZ DE PUESTOS** (jugando, desconectado, bloqueado…). Puedes **CONGELAR** o **FINALIZAR** cuando quieras.
6. Al terminar: **FINALIZAR** → **SALIR**; después presiona **ENTER** en la ventana del script.

---

## 6. PARTE D — LO QUE NO DEBES HACER ❌

1. **NO cierres la ventana del script** (ni con la X) mientras haya clase: eso mata el backend y el túnel. Solo se cierra con **ENTER** y al final.
2. **NO pegues `https://....trycloudflare.com` tal cual:** eso es un ejemplo de esta guía. Pega la URL **real** que imprime el script (ya está en el portapapeles).
3. **NO pegues la URL del túnel en `server/.env` ni en el `.env` de la raíz:** esos archivos son solo para desarrollo local (`localhost:3001`). La URL del túnel vive únicamente en la variable `VITE_API_URL` de GitHub.
4. **NO edites `CLIENT_ORIGINS` en `server/.env`:** el script ya fija ese valor solo hacia el origen de Pages.
5. **NO abras puertos en el router ni toques el firewall de red:** el túnel es una conexión *saliente*; abrir puertos solo te expondría sin necesidad.
6. **NO ejecutes `npm run dev:server` a la vez** que el script (ni otra instancia del script): chocan en el puerto y verás *"El puerto 3001 ya está en uso"*.
7. **NO cambies Pages a "Deploy from a branch"** y **NO borres** el workflow `.github/workflows/pages.yml`: el frontend necesita compilarse con la variable `VITE_API_URL`.
8. **NO compartas** con los alumnos la URL del panel ni la contraseña del instructor.
9. **NO subas `server/.env` a git** (`git add server/.env` está prohibido; hoy está ignorado y no está en el repositorio).
10. **NO reinicies el script a mitad de clase sin motivo:** cada reinicio cambia la URL y obliga a reconfigurar GitHub y a que los alumnos recarguen.
11. **NO uses `-Memoria`** si quieres conservar los datos después de cerrar: en ese modo todo se borra al terminar (útil para ensayo, no para tu ronda real).
12. **NO apagues ni suspendas la PC** durante la presentación: la sala vive ahí.
13. **NO toques `HOST` ni `NODE_ENV` en `server/.env`:** `HOST=127.0.0.1` hace que el backend exista **solo en tu PC** (el único acceso externo es el túnel) y `NODE_ENV=production` permite aplicar los límites de intentos de login **por IP real**. Cambiarlos abriría el juego a toda la red local y desactivaría esa protección.

---

## 7. PARTE E — SI ALGO FALLA (síntoma → solución)

| Lo que ves | Causa probable | Solución |
| :--- | :--- | :--- |
| *"El puerto 3001 ya está en uso"* | Quedó un proceso anterior | `.\iniciar-sala.ps1 -Puerto 3002` o cierra el proceso que indica el mensaje (PID) |
| *"El backend no respondió…"* | MySQL apagado | Enciende MySQL o ejecuta `.\iniciar-sala.ps1 -Memoria` |
| *"No se encontró cloudflared"* | Otro equipo o instalación borrada | `winget install --id Cloudflare.cloudflared -e` |
| El juego carga pero **sin sala** (juega local) | `VITE_API_URL` vacía o workflow sin correr | Parte **B4** + recarga en incógnito con Ctrl+Shift+R |
| Los alumnos **no conectan** | La URL cambió o se cerró la ventana | Vuelve a ejecutar el script → **B4** → alumnos recargan |
| El panel dice **SIN SEÑAL / DESCONECTADO** | Mismo caso anterior (URL desactualizada) | Parte **B4** y espera el workflow verde |
| La autoprueba tarda | DNS del túnel (hasta ~60 s) | Espera; con `-Probar` reintenta solo hasta 2 minutos |
| *"Origen no autorizado"* | El origen de Pages cambió o se editó a mano | Usa el script tal cual (fija el origen correcto) o revisa `CLIENT_ORIGINS` |
| Se cortó internet en el salón | El túnel depende de tu conexión | Sin internet no hay modo sala; reanuda cuando vuelva |

**Comprobación manual del backend** (en otra ventana de PowerShell):

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health -UseBasicParsing
```

(Usa `127.0.0.1` y no `localhost`: el backend solo escucha en esa dirección y `localhost` podría resolver primero a `::1`.)

Debe responder `{"ok":true,...}`.

---

## 8. Resumen de una línea

> **Una sola vez:** instalar cloudflared + cambiar la contraseña + crear `VITE_API_URL` en GitHub.
> **Cada clase:** `iniciar-sala.bat` → copiar URL nueva a `VITE_API_URL` (si cambió) → Run workflow → probar en incógnito → dejar la ventana abierta → ENTER al final.
