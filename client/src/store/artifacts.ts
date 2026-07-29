import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import type { Artifact } from '~/common';

export const artifactsState = atomWithReset<Record<string, Artifact | undefined> | null>(null);

export const currentArtifactId = atomWithReset<string | null>(null);

export const artifactsVisibility = atom<boolean>(true);

export const visibleArtifacts = atomWithReset<Record<string, Artifact | undefined> | null>(null);
