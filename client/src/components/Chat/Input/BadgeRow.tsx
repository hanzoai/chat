import { memo } from 'react';
import CodeInterpreter from './CodeInterpreter';
import ToolDialogs from './ToolDialogs';
import FileSearch from './FileSearch';
import Artifacts from './Artifacts';
import MCPSelect from './MCPSelect';
import WebSearch from './WebSearch';

/**
 * The turn's tools: web search, the interpreter, file search, artifacts, MCP.
 *
 * This file used to be 400 lines, and 370 of them reordered a list that was
 * always empty. A pointer-driven drag layer — reducer, ghost element, `document`
 * mousemove/mouseup listeners, a persisted order in localStorage — sat over
 * `useChatBadges()`, whose registry held nothing but a commented-out entry
 * naming an atom (`store.codeArtifacts`) that does not exist. Its edit mode was
 * unreachable by construction: `isEditingBadges` was read in three places and
 * written only ever to `false`. So the drag never started, the ghost never
 * painted, the saved order described nothing, and the stored `{id:'1'}` seed
 * matched no badge. The five controls below are what the row has always drawn.
 */
function BadgeRow({ showEphemeralBadges }: { showEphemeralBadges?: boolean }) {
  return (
    <>
      <div className="relative flex flex-wrap items-center gap-2">
        {showEphemeralBadges === true && (
          <>
            <WebSearch />
            <CodeInterpreter />
            <FileSearch />
            <Artifacts />
            <MCPSelect />
          </>
        )}
      </div>
      <ToolDialogs />
    </>
  );
}

export default memo(BadgeRow);
