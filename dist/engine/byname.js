export const BOUND_BY_NAME = new Map([
    ['bass', ['style']],
    ['keys', ['style']],
    ['pad', ['style']],
    ['lead', ['style']],
    ['bass_performer', ['bassV', 'style']],
    ['pad_performer', ['padV', 'style']],
    ['stab_performer', ['keysV', 'style']],
    ['lead_performer', ['leadV', 'style']],
]);
export const byNameMessage = (id, parameter, line) => `${JSON.stringify(id)} reads &${parameter} by name no longer: pass it, ${line} (Migrate writes it, decision 075)`;
