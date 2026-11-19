import { TestBed } from '@angular/core/testing';

import { cloneParams, DEFAULT_PARAMS } from '../params';
import { PcbModelService } from './pcb-model.service';
import type { ParsedPcbModel } from './pcb-model-loader';
import { cuboid } from '@jscad/modeling/src/primitives';

describe('PcbModelService', () => {
  let service: PcbModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PcbModelService],
    });
    service = TestBed.inject(PcbModelService);
  });

  it('initializes with null custom model', () => {
    expect(service.customModel()).toBeNull();
  });

  it('returns null geometry when pcbPreview is disabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbPreview.enabled = false;
    expect(service.getPcbGeometry(params)).toBeNull();
  });

  it('returns null geometry for box model type', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbPreview.enabled = true;
    params.pcbPreview.modelType = 'box';
    expect(service.getPcbGeometry(params)).toBeNull();
  });

  it('returns predefined geometry for rpi-pico', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbPreview.enabled = true;
    params.pcbPreview.modelType = 'rpi-pico';
    const geom = service.getPcbGeometry(params);
    expect(geom).not.toBeNull();
  });

  it('stores and returns custom model when set', () => {
    const mockModel: ParsedPcbModel = {
      name: 'test.stl',
      geom: cuboid({ size: [10, 20, 2] }),
      dims: [10, 20, 2],
      triangleCount: 12,
    };
    service.setCustomModel(mockModel);
    expect(service.customModel()).toBe(mockModel);

    const params = cloneParams(DEFAULT_PARAMS);
    params.pcbPreview.enabled = true;
    params.pcbPreview.modelType = 'custom';
    const geom = service.getPcbGeometry(params);
    expect(geom).toBe(mockModel.geom);

    service.clearCustomModel();
    expect(service.customModel()).toBeNull();
  });
});
