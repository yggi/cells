const at = (sync, harm, artic, energy) => ({ sync, harm, artic, energy });
const SYNTH_POP = at(0.3, 0.45, 0.55, 0.55);
const TECHNO = at(0.12, 0, 1, 0.8);
const DEEP_HOUSE = at(0.35, 0.55, 0.65, 0.65);
const AMBIENT = at(0.05, 0.3, 0, 0.2);
const LO_FI = at(0.5, 0.75, 0.35, 0.5);
const FUNK = at(1, 0.12, 0.85, 0.75);
const BOSSA_NOVA = at(0.75, 0.85, 0.45, 0.45);
const SWING_JAZZ = at(0.35, 1, 0.3, 0.6);
const weighted = (...points) => points.map((point) => ({ point, weight: 1 }));
export const METER_FRAGMENTS = [
    { id: '4/4', text: '&bar meter("4/4")', association: weighted(SYNTH_POP, TECHNO, BOSSA_NOVA) },
    { id: '4/4 swung on 8n', text: '&bar meter("4/4") swing=8n:2/3', association: weighted(SWING_JAZZ) },
    { id: '4/4 leaning on 16n', text: '&bar meter("4/4") swing=16n:.65', association: weighted(LO_FI) },
    { id: '4/4 leaning lightly on 16n', text: '&bar meter("4/4") swing=16n:.6', association: weighted(DEEP_HOUSE, FUNK) },
    { id: '4/4 leaning faintly on 16n', text: '&bar meter("4/4") swing=16n:31/60', association: weighted(AMBIENT) },
    { id: '4/4 alla breve', text: '&bar meter("4/4") beat=2', association: weighted(at(0.2, 0.6, 0.9, 1)) },
    { id: '2/4', text: '&bar meter("2/4")', association: weighted(at(0, 0.1, 0.6, 1)) },
    { id: '3/4', text: '&bar meter("3/4")', association: weighted(at(0, 0.7, 0.3, 0)) },
    { id: '6/8', text: '&bar meter("6/8")', association: weighted(at(0.3, 0.2, 0.2, 0)) },
    { id: '12/8', text: '&bar meter("12/8")', association: weighted(at(0.7, 0.6, 0, 0.2)) },
    { id: '5/4', text: '&bar meter("5/4")', association: weighted(at(0.4, 0.9, 0.5, 0.3)) },
    { id: '7/8', text: '&bar meter("7/8")', association: weighted(at(0.8, 0.6, 1, 1)) },
    { id: '10/8', text: '&bar meter("10/8")', association: weighted(at(0.6, 0.9, 0.8, 0.9)) },
];
