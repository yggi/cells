import { AMBIENT, at, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO, weighted } from "./presets.js";
export const METER_FRAGMENTS = [
    { id: '4/4', text: '&bar meter("4/4")', association: weighted(SYNTH_POP, TECHNO, BOSSA_NOVA), facet: 'meter' },
    { id: '4/4 swung on 8n', text: '&bar meter("4/4") swing=8n:2/3', association: weighted(SWING_JAZZ), facet: 'meter' },
    { id: '4/4 leaning on 16n', text: '&bar meter("4/4") swing=16n:.65', association: weighted(LO_FI), facet: 'meter' },
    { id: '4/4 leaning lightly on 16n', text: '&bar meter("4/4") swing=16n:.6', association: weighted(DEEP_HOUSE, FUNK), facet: 'meter' },
    { id: '4/4 leaning faintly on 16n', text: '&bar meter("4/4") swing=16n:31/60', association: weighted(AMBIENT), facet: 'meter' },
    { id: '4/4 alla breve', text: '&bar meter("4/4") beat=2', association: weighted(at(0.2, 0.6, 0.9, 1)), facet: 'meter' },
    { id: '2/4', text: '&bar meter("2/4")', association: weighted(at(0, 0.1, 0.6, 1)), facet: 'meter' },
    { id: '3/4', text: '&bar meter("3/4")', association: weighted(at(0, 0.7, 0.3, 0)), facet: 'meter' },
    { id: '6/8', text: '&bar meter("6/8")', association: weighted(at(0.3, 0.2, 0.2, 0)), facet: 'meter' },
    { id: '12/8', text: '&bar meter("12/8")', association: weighted(at(0.7, 0.6, 0, 0.2)), facet: 'meter' },
    { id: '5/4', text: '&bar meter("5/4")', association: weighted(at(0.4, 0.9, 0.5, 0.3)), facet: 'meter' },
    { id: '7/8', text: '&bar meter("7/8")', association: weighted(at(0.8, 0.6, 1, 1)), facet: 'meter' },
    { id: '10/8', text: '&bar meter("10/8")', association: weighted(at(0.6, 0.9, 0.8, 0.9)), facet: 'meter' },
];
