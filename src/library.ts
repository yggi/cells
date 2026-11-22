/**
 * `@yggi/cells/library`: what the language ships as data, and the vocabularies a text is written in. The seed
 * (`LIBRARY`, `resolveSeed`, `PARTS`), the styles and the axes of style space (`STYLES`, `nearestStyle`, `AXES`), the
 * band (`PERFORMER_VOICES`, `instrumentsAt`, `bandAt`, `resolveBand`), the examples and their tags, the modes and
 * note names, the sound parameters (`DOUGH_PARAMS`) and a rhythm's generator (`bjorklund`). Nothing here is new: each
 * name is what a frontend reached by a module path (`docs/api.md` lists them), now from one place. A drawing's hue
 * (`pitchHue`) is not here: it moves to Cell studio (decision 086). Every vocabulary a text writes (the drum roles,
 * the parts, the facets, the meters) as a runtime list is #717's, and lands here.
 */
export { bandAt, bandLine, CENTRE, INSTRUMENT_REACH, instrumentsAt, PERFORMER_VOICES, resolveBand, scoreStyle, type FoundInstrument, type VoicedPart } from './repository/band';
export { FACETS, fromId, headOf, isLibraryFragment, LIBRARY, SECTION_KINDS, PARTS, resolveSeed, resolverOf, usesOf, type PartUse } from './repository/library';
export { nearestStyle, STYLES, type NearStyle, type Style } from './repository/styles';
export { AXES, AXIS_NAMES, SLOTS, type Axis } from './engine/style';
export { EXAMPLES, type Example, type ExampleKey } from './engine/examples';
export { canonicalTags, MIDI_FILE, parseTag, tagKind, tagName, TUTORIAL, type TagKind } from './engine/tags';
export { DOUGH_PARAMS, DOUGH_SOURCES } from './engine/dough-params';
export { VOICE_KIT } from './engine/compiler/declare';
export { DRUM_ROLES, FEEL_PARTS, SECTION_TYPES } from './engine/perform/feel';
export { GM_KIT, kitVoiceOf } from './engine/midi';
export { backbeatOf } from './engine/vary';
export { bjorklund } from './engine/parser/generators';
export { midiOf, mod, modeBrightness, modeName, NOTE_NAMES, noteName, SCALES } from './theory/modes';
export { TONAL_SCALES } from './theory/tonal';
