import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import type {
  CableClamp,
  DisplayBezel,
  Hole,
  InternalWall,
  LanyardLoop,
  MeasurementSystem,
  PCBMount,
  Params,
  PCBModelType,
  PCBPreview,
  SideGrips,
  SnapFit,
  VentGrille,
} from '../../core/params';
import {
  DEFAULT_CABLE_CLAMP,
  DEFAULT_DISPLAY_BEZEL,
  DEFAULT_LANYARD_LOOP,
  DEFAULT_SIDE_GRIPS,
  DEFAULT_VENT_GRILLE,
} from '../../core/params';
import { PRESETS, type PresetKey } from '../../core/presets';
import { EnclosureStateService } from '../../core/state/enclosure-state.service';
import { PcbModelService } from '../../core/pcb/pcb-model.service';
import { mmToInches } from '../../core/units';

type Surface = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

@Component({
  selector: 'app-params-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './params-form.component.html',
  styleUrl: './params-form.component.css',
})
export class ParamsFormComponent {
  private readonly state = inject(EnclosureStateService);
  readonly pcbModelService = inject(PcbModelService);

  readonly activeTab = signal<number | null>(null);

  readonly surfaces: Surface[] = ['front', 'right', 'back', 'left', 'top', 'bottom'];

  surfaceLabel(surface: Surface): string {
    if (surface === 'top') {
      return 'Lid';
    }
    return surface[0].toUpperCase() + surface.slice(1);
  }

  params(): Params {
    return this.state.params();
  }

  measurementSystem(): MeasurementSystem {
    return this.params().measurementSystem ?? 'metric';
  }

  isImperial(): boolean {
    return this.measurementSystem() === 'imperial';
  }

  unit(): string {
    return this.isImperial() ? 'in' : 'mm';
  }

  setMeasurementSystem(system: MeasurementSystem): void {
    this.state.setMeasurementSystem(system);
  }

  setActiveTab(tab: number): void {
    this.activeTab.set(this.activeTab() === tab ? null : tab);
  }

  readonly presets = Object.values(PRESETS);

  applyPreset(key: string): void {
    this.state.applyPreset(key as PresetKey);
  }

  resetToSimpleEnclosure(): void {
    this.state.resetToSimpleEnclosure();
    this.activeTab.set(1);
  }

  setNumberParam<K extends keyof Params>(key: K, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      this.state.updateParam(key, parsed as Params[K]);
    }
  }

  setBooleanParam<K extends keyof Params>(key: K, checked: boolean): void {
    this.state.updateParam(key, checked as Params[K]);
  }

  addHole(): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    const next: Hole = {
      shape: 'circle',
      surface: 'front',
      diameter: isImp ? mmToInches(12.5) : 12.5,
      width: isImp ? mmToInches(10) : 10,
      length: isImp ? mmToInches(10) : 10,
      flatWidth: isImp ? mmToInches(11) : 11,
      rotation: 0,
      y: Number((current.width / 2).toFixed(isImp ? 4 : 2)),
      x: isImp ? mmToInches(6) : 6,
    };
    this.state.patchParams({ holes: [...current.holes, next] });
  }

  removeHole(index: number): void {
    const current = this.params();
    this.state.patchParams({ holes: current.holes.filter((_, i) => i !== index) });
  }

  updateHole(index: number, patch: Partial<Hole>): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    this.state.patchParams({
      holes: current.holes.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...patch };
        if (patch.shape === 'double-d') {
          if (updated.flatWidth === undefined) {
            const defaultFlat = isImp ? mmToInches(11) : 11;
            updated.flatWidth = updated.diameter
              ? Number((updated.diameter * 0.9).toFixed(isImp ? 4 : 1))
              : defaultFlat;
          }
          if (updated.rotation === undefined) {
            updated.rotation = 0;
          }
        }
        return updated;
      }),
    });
  }

  addPcbMount(): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    const next: PCBMount = {
      surface: 'bottom',
      x: 0,
      y: 0,
      height: isImp ? mmToInches(5) : 5,
      outerDiameter: isImp ? mmToInches(6) : 6,
      screwDiameter: isImp ? mmToInches(2) : 2,
      chamfer: true,
    };
    this.state.patchParams({ pcbMounts: [...current.pcbMounts, next] });
  }

  removePcbMount(index: number): void {
    const current = this.params();
    this.state.patchParams({ pcbMounts: current.pcbMounts.filter((_, i) => i !== index) });
  }

  updatePcbMount(index: number, patch: Partial<PCBMount>): void {
    const current = this.params();
    this.state.patchParams({
      pcbMounts: current.pcbMounts.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  addInternalWall(): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    const next: InternalWall = {
      x: 0,
      y: 0,
      height: isImp ? mmToInches(10) : 10,
      length: isImp ? mmToInches(25) : 25,
      thickness: isImp ? mmToInches(2) : 2,
      rotation: 0,
    };
    this.state.patchParams({ internalWalls: [...current.internalWalls, next] });
  }

  removeInternalWall(index: number): void {
    const current = this.params();
    this.state.patchParams({ internalWalls: current.internalWalls.filter((_, i) => i !== index) });
  }

  updateInternalWall(index: number, patch: Partial<InternalWall>): void {
    const current = this.params();
    this.state.patchParams({
      internalWalls: current.internalWalls.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  addCableClamp(): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    const baseClamp = DEFAULT_CABLE_CLAMP;
    const next: CableClamp = isImp
      ? {
          ...baseClamp,
          length: mmToInches(baseClamp.length),
          wallHeight: mmToInches(baseClamp.wallHeight),
          wallThickness: mmToInches(baseClamp.wallThickness),
          mountScrewDiameter: mmToInches(baseClamp.mountScrewDiameter),
          mountOuterDiameter: mmToInches(baseClamp.mountOuterDiameter),
          mountHeight: mmToInches(baseClamp.mountHeight),
          topHeight: mmToInches(baseClamp.topHeight),
          topScrewDiameter: mmToInches(baseClamp.topScrewDiameter),
        }
      : { ...baseClamp };
    this.state.patchParams({ cableClamps: [...(current.cableClamps ?? []), next] });
  }

  removeCableClamp(index: number): void {
    const current = this.params();
    this.state.patchParams({
      cableClamps: (current.cableClamps ?? []).filter((_, i) => i !== index),
    });
  }

  updateCableClamp(index: number, patch: Partial<CableClamp>): void {
    const current = this.params();
    this.state.patchParams({
      cableClamps: (current.cableClamps ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  onWaterproofChange(checked: boolean): void {
    this.state.patchParams({
      waterProof: checked,
      lidScrews: checked ? true : this.params().lidScrews,
    });
  }

  onLidScrewsChange(checked: boolean): void {
    this.state.patchParams({
      lidScrews: checked,
      waterProof: checked ? this.params().waterProof : false,
    });
  }

  setStringParam<K extends keyof Params>(key: K, value: Params[K]): void {
    this.state.updateParam(key, value);
  }

  onDinRailMountChange(checked: boolean): void {
    this.state.patchParams({
      dinRailMount: checked,
      wallMounts: checked ? true : this.params().wallMounts,
    });
  }

  parseIntValue(rawValue: string): number {
    return parseInt(rawValue, 10);
  }

  setSnapFitEnabled(enabled: boolean): void {
    const current = this.params();
    this.state.patchParams({
      snapFit: {
        ...current.snapFit,
        enabled,
      },
    });
  }

  setSnapFitPreset(rawValue: string): void {
    const preset = parseInt(rawValue, 10);
    if (preset === 4 || preset === 6 || preset === 8) {
      const current = this.params();
      this.state.patchParams({
        snapFit: {
          ...current.snapFit,
          preset,
        },
      });
    }
  }

  setSnapFitNumber<K extends keyof SnapFit>(key: K, rawValue: string): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      const current = this.params();
      this.state.patchParams({
        snapFit: {
          ...current.snapFit,
          [key]: parsed,
        },
      });
    }
  }

  setPcbPreviewEnabled(checked: boolean): void {
    const current = this.params();
    this.state.patchParams({
      pcbPreview: {
        ...current.pcbPreview,
        enabled: checked,
      },
    });
  }

  setPcbPreviewNumber<K extends Exclude<keyof PCBPreview, 'enabled'>>(
    key: K,
    rawValue: string,
  ): void {
    if (!rawValue) {
      return;
    }
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      const current = this.params();
      this.state.patchParams({
        pcbPreview: {
          ...current.pcbPreview,
          [key]: parsed,
        },
      });
    }
  }

  async onPcbFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    try {
      const parsed = await this.pcbModelService.loadFromFile(file);
      const current = this.params();
      const isImp = current.measurementSystem === 'imperial';
      const w = isImp ? mmToInches(parsed.dims[0]) : parsed.dims[0];
      const l = isImp ? mmToInches(parsed.dims[1]) : parsed.dims[1];
      const t = isImp ? mmToInches(parsed.dims[2]) : parsed.dims[2];
      this.state.patchParams({
        pcbPreview: {
          ...current.pcbPreview,
          enabled: true,
          modelType: 'custom',
          modelFileName: parsed.name,
          modelTriangleCount: parsed.triangleCount,
          width: Number(w.toFixed(2)),
          length: Number(l.toFixed(2)),
          thickness: Number(t.toFixed(2)),
        },
      });
    } catch (err) {
      console.error('Failed to load 3D PCB file:', err);
    }
  }

  selectPcbModelType(modelType: PCBModelType): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    let w = current.pcbPreview.width;
    let l = current.pcbPreview.length;
    let t = current.pcbPreview.thickness;

    if (modelType === 'rpi-pico') {
      w = isImp ? mmToInches(21) : 21;
      l = isImp ? mmToInches(51) : 51;
      t = isImp ? mmToInches(3) : 3;
    } else if (modelType === 'arduino-uno') {
      w = isImp ? mmToInches(53.4) : 53.4;
      l = isImp ? mmToInches(68.6) : 68.6;
      t = isImp ? mmToInches(15) : 15;
    } else if (modelType === 'esp32') {
      w = isImp ? mmToInches(28) : 28;
      l = isImp ? mmToInches(52) : 52;
      t = isImp ? mmToInches(10) : 10;
    } else if (modelType === 'flipper-module') {
      w = isImp ? mmToInches(32) : 32;
      l = isImp ? mmToInches(65) : 65;
      t = isImp ? mmToInches(10) : 10;
    }

    this.state.patchParams({
      pcbPreview: {
        ...current.pcbPreview,
        modelType,
        width: Number(w.toFixed(2)),
        length: Number(l.toFixed(2)),
        thickness: Number(t.toFixed(2)),
      },
    });
  }

  clearCustomPcbModel(): void {
    this.pcbModelService.clearCustomModel();
    const current = this.params();
    this.state.patchParams({
      pcbPreview: {
        ...current.pcbPreview,
        modelType: 'box',
        modelFileName: undefined,
        modelTriangleCount: undefined,
      },
    });
  }

  addVentGrille(): void {
    const current = this.params();
    const isImp = current.measurementSystem === 'imperial';
    const baseGrille = DEFAULT_VENT_GRILLE;
    const next: VentGrille = isImp
      ? {
          ...baseGrille,
          slotWidth: mmToInches(baseGrille.slotWidth),
          slotLength: mmToInches(baseGrille.slotLength),
          spacing: mmToInches(baseGrille.spacing),
          cornerRadius:
            baseGrille.cornerRadius !== undefined ? mmToInches(baseGrille.cornerRadius) : undefined,
        }
      : { ...baseGrille };
    this.state.patchParams({ ventGrilles: [...(current.ventGrilles ?? []), next] });
  }

  removeVentGrille(index: number): void {
    const current = this.params();
    this.state.patchParams({
      ventGrilles: (current.ventGrilles ?? []).filter((_, i) => i !== index),
    });
  }

  updateVentGrille(index: number, patch: Partial<VentGrille>): void {
    const current = this.params();
    this.state.patchParams({
      ventGrilles: (current.ventGrilles ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  setDisplayBezelEnabled(enabled: boolean): void {
    const current = this.params();
    const bezel = current.displayBezel ?? { ...DEFAULT_DISPLAY_BEZEL };
    this.state.patchParams({
      displayBezel: {
        ...bezel,
        enabled,
      },
    });
  }

  updateDisplayBezel(patch: Partial<DisplayBezel>): void {
    const current = this.params();
    const bezel = current.displayBezel ?? { ...DEFAULT_DISPLAY_BEZEL };
    this.state.patchParams({
      displayBezel: {
        ...bezel,
        ...patch,
      },
    });
  }

  setLanyardLoopEnabled(enabled: boolean): void {
    const current = this.params();
    const loop = current.lanyardLoop ?? { ...DEFAULT_LANYARD_LOOP };
    this.state.patchParams({
      lanyardLoop: {
        ...loop,
        enabled,
      },
    });
  }

  updateLanyardLoop(patch: Partial<LanyardLoop>): void {
    const current = this.params();
    const loop = current.lanyardLoop ?? { ...DEFAULT_LANYARD_LOOP };
    this.state.patchParams({
      lanyardLoop: {
        ...loop,
        ...patch,
      },
    });
  }

  setSideGripsEnabled(enabled: boolean): void {
    const current = this.params();
    const grips = current.sideGrips ?? { ...DEFAULT_SIDE_GRIPS };
    this.state.patchParams({
      sideGrips: {
        ...grips,
        enabled,
      },
    });
  }

  updateSideGrips(patch: Partial<SideGrips>): void {
    const current = this.params();
    const grips = current.sideGrips ?? { ...DEFAULT_SIDE_GRIPS };
    this.state.patchParams({
      sideGrips: {
        ...grips,
        ...patch,
      },
    });
  }
}
