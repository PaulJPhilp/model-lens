import { Layer } from 'effect';
import { ModelServiceLive } from './services/ModelServiceLive';
import { FilterServiceLive } from './services/FilterServiceLive';
import { ModeServiceLive } from './services/ModeService.live';

export const AppLayer = Layer.mergeAll(ModelServiceLive, FilterServiceLive, ModeServiceLive);
