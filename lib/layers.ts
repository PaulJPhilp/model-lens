import { Layer } from 'effect';
import { ModelServiceLive } from './services/ModelService.live';
import { FilterServiceLive } from './services/FilterService.live';
import { ModeServiceLive } from './services/ModeService.live';

export const AppLayer = Layer.mergeAll(ModelServiceLive, FilterServiceLive, ModeServiceLive);
