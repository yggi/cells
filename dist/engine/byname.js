export const BOUND_BY_NAME = new Map([
    ['bass', ['style']],
    ['keys', ['style']],
    ['pad', ['style']],
    ['lead', ['style']],
    ['bass_performer', ['bassV', 'style']],
    ['pad_performer', ['padV', 'style']],
    ['stab_performer', ['keysV', 'style']],
    ['lead_performer', ['leadV', 'style']],
    ['band', ['drumlines', 'bassline', 'padline', 'stabline', 'leadline', 'bassLevel', 'padLevel', 'stabLevel', 'leadLevel', 'style']],
]);
export const byNameMessage = (id, parameters, line) => `${JSON.stringify(id)} reads ${parameters.map((p) => `&${p}`).join(', ')} by name no longer: pass ${parameters.length > 1 ? 'them' : 'it'}, ${line} (Migrate writes it, decision 075)`;
