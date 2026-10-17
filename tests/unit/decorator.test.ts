import { describe, it, expect, vi } from 'vitest';
import { Block, MAX_BLOCK_HEIGHT } from '../../src/core/models/Block';
import { BaseBlockView } from '../../src/structural/decorators/BaseBlockView';
import { AbstractBlockDecorator } from '../../src/structural/decorators/AbstractBlockDecorator';
import { HighlightPeakDecorator } from '../../src/structural/decorators/HighlightPeakDecorator';
import { ScanlineGlitchDecorator } from '../../src/structural/decorators/ScanlineGlitchDecorator';
import type { IBlockView } from '../../src/structural/decorators/IBlockView';

/**
 * Fabrica un mock de CanvasRenderingContext2D con los metodos minimos
 * necesarios para las pruebas de renderizado.
 */
function mockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('Patron Decorator — Bloque Visual', () => {
  // -------------------------------------------------------
  //  BaseBlockView (componente concreto)
  // -------------------------------------------------------
  describe('BaseBlockView', () => {
    it('llama a fillRect y strokeRect al renderizar', () => {
      const ctx = mockCtx();
      const block = new Block(2);
      const view = new BaseBlockView();

      view.render(ctx, block, 10, 20, 40, 60);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('renderiza bloques de distintas alturas sin error', () => {
      const ctx = mockCtx();
      const view = new BaseBlockView();

      for (let h = 0; h <= MAX_BLOCK_HEIGHT; h++) {
        expect(() => view.render(ctx, new Block(h), 0, 0, 30, 30)).not.toThrow();
      }
    });
  });

  // -------------------------------------------------------
  //  AbstractBlockDecorator (clase base abstracta)
  // -------------------------------------------------------
  describe('AbstractBlockDecorator', () => {
    it('delega la llamada render al componente envuelto', () => {
      const innerView: IBlockView = { render: vi.fn() };
      // Instancia concreta minima para probar la delegacion
      class TestDecorator extends AbstractBlockDecorator {
        public constructor(wrapped: IBlockView) { super(wrapped); }
      }

      const decorator = new TestDecorator(innerView);
      const ctx = mockCtx();
      const block = new Block(1);

      decorator.render(ctx, block, 5, 10, 20, 40);

      expect(innerView.render).toHaveBeenCalledWith(ctx, block, 5, 10, 20, 40);
    });
  });

  // -------------------------------------------------------
  //  HighlightPeakDecorator
  // -------------------------------------------------------
  describe('HighlightPeakDecorator', () => {
    it('aplica halo solo cuando la altura es MAX_BLOCK_HEIGHT', () => {
      const ctx = mockCtx();
      const peakBlock = new Block(MAX_BLOCK_HEIGHT);
      const view = new HighlightPeakDecorator(new BaseBlockView());

      view.render(ctx, peakBlock, 0, 0, 30, 30);

      // save/restore se llaman para el efecto de sombra
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('NO aplica halo cuando la altura es menor que MAX_BLOCK_HEIGHT', () => {
      const ctx = mockCtx();
      const lowBlock = new Block(1);
      const view = new HighlightPeakDecorator(new BaseBlockView());

      view.render(ctx, lowBlock, 0, 0, 30, 30);

      // save/restore NO se llaman porque no hay efecto de pico
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  //  ScanlineGlitchDecorator
  // -------------------------------------------------------
  describe('ScanlineGlitchDecorator', () => {
    it('dibuja lineas de barrido sobre bloques no vacios', () => {
      const ctx = mockCtx();
      const block = new Block(3);
      const view = new ScanlineGlitchDecorator(new BaseBlockView());

      view.render(ctx, block, 0, 0, 30, 30);

      // save/restore por las scanlines
      expect(ctx.save).toHaveBeenCalled();
      // fillRect se llama varias veces: base + scanlines
      const fillCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(fillCalls).toBeGreaterThan(1);
    });

    it('NO dibuja scanlines sobre bloques vacios (height 0)', () => {
      const ctx = mockCtx();
      const emptyBlock = new Block(0);
      const view = new ScanlineGlitchDecorator(new BaseBlockView());

      view.render(ctx, emptyBlock, 0, 0, 30, 30);

      // Solo la base llama a fillRect; save no se llama para scanlines
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  //  Composicion de decoradores (encadenamiento)
  // -------------------------------------------------------
  describe('Composicion de decoradores', () => {
    it('apila multiples decoradores sin mutar el Block original', () => {
      const ctx = mockCtx();
      const block = new Block(MAX_BLOCK_HEIGHT);
      const original = block.height;

      const baseView = new BaseBlockView();
      const withPeaks = new HighlightPeakDecorator(baseView);
      const withScanlines = new ScanlineGlitchDecorator(withPeaks);

      withScanlines.render(ctx, block, 0, 0, 30, 30);

      // El bloque no ha sido mutado
      expect(block.height).toBe(original);
      expect(Object.isFrozen(block)).toBe(true);
    });

    it('la cadena de decoradores invoca todas las capas', () => {
      const innerRender = vi.fn();
      const inner: IBlockView = { render: innerRender };
      const d1 = new HighlightPeakDecorator(inner);
      const d2 = new ScanlineGlitchDecorator(d1);

      const ctx = mockCtx();
      const block = new Block(MAX_BLOCK_HEIGHT);

      d2.render(ctx, block, 0, 0, 30, 30);

      // El render mas interno fue invocado (delegacion transitiva)
      expect(innerRender).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------
  //  Caja Blanca: el Decorator no modifica la entidad Block
  // -------------------------------------------------------
  describe('Aislamiento de dominio (Caja Blanca)', () => {
    it('Block permanece inmutable tras multiples renders decorados', () => {
      const ctx = mockCtx();
      const blocks = [new Block(0), new Block(2), new Block(MAX_BLOCK_HEIGHT)];
      const view = new ScanlineGlitchDecorator(new HighlightPeakDecorator(new BaseBlockView()));

      blocks.forEach((b) => {
        const snapshot = { height: b.height, type: b.type };
        view.render(ctx, b, 0, 0, 30, 30);
        expect(b.height).toBe(snapshot.height);
        expect(b.type).toBe(snapshot.type);
        expect(Object.isFrozen(b)).toBe(true);
      });
    });
  });
});
