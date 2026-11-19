import { Injectable, signal } from '@angular/core';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import {
  getPredefinedPcbModel,
  loadPcbModelFromBuffer,
  type ParsedPcbModel,
} from './pcb-model-loader';
import type { PCBModelType, Params } from '../params';

@Injectable({
  providedIn: 'root',
})
export class PcbModelService {
  readonly customModel = signal<ParsedPcbModel | null>(null);

  async loadFromFile(file: File): Promise<ParsedPcbModel> {
    const isObj = file.name.toLowerCase().endsWith('.obj');
    let parsed: ParsedPcbModel;
    if (isObj) {
      const text = await file.text();
      parsed = loadPcbModelFromBuffer(file.name, text);
    } else {
      const buffer = await file.arrayBuffer();
      parsed = loadPcbModelFromBuffer(file.name, buffer);
    }
    this.customModel.set(parsed);
    return parsed;
  }

  setCustomModel(model: ParsedPcbModel | null): void {
    this.customModel.set(model);
  }

  clearCustomModel(): void {
    this.customModel.set(null);
  }

  getPcbGeometry(params: Params): Geom3 | null {
    const preview = params.pcbPreview;
    if (!preview || !preview.enabled) {
      return null;
    }
    const modelType = preview.modelType ?? 'box';
    if (modelType === 'custom' && this.customModel()) {
      return this.customModel()!.geom;
    }
    return getPredefinedPcbModel(modelType);
  }
}
