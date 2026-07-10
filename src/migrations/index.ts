import * as migration_20260517_042750_initial from './20260517_042750_initial';

export const migrations = [
  {
    up: migration_20260517_042750_initial.up,
    down: migration_20260517_042750_initial.down,
    name: '20260517_042750_initial'
  },
];
