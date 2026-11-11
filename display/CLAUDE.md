# display/CLAUDE.md — kiosk

## Contratto tracking → main (non legare la scena alle gesture)
`initTracking({videoEl, canvasEl, callbacks})` emette: `onPointerMove(x,y)`, `onSelect()`, `onPan(dx,dy)`, `onZoom(factor)`, `onHandStateChange(left,right)`.
- Mano **destra** fisica (label MediaPipe `Left`, camera specchiata): l'indice muove il puntatore (One Euro); pinch prolungato = pan con inerzia, puntatore congelato durante il pan (D19).
- Mano **sinistra** fisica: pinch (isteresi 0.28/0.38, hold) = select sul punto del mirino; polso inclinato >20° a mano aperta = zoom continuo.
- Mouse disattivato sul display (D18): eventi bloccati in cattura e cursore nascosto. Solo `/display/?mouse=1` lo riattiva per manutenzione/test (click = select, rotella = zoom).

## Layout e menu destro contestuale (`main.js → activateLayout`)
| Layout | Menu destro |
|---|---|
| `nodi` | nessuno (nascosto) |
| `cluster` | tag presenti nei dati → `setClusterTag` |
| `planimetria` | Piano Terra / Primo / Secondo → `setFloor` |
| `timeline` | Tutti gli anni + anni → `setTimelineYear` |
| `griglia` | ordina per Data / Media / Tag / Luogo → `setGridSort` |

I menu compaiono per prossimità del puntatore ai bordi (enter 240px, leave 380px). Tasti kiosk: `1-5` layout, `I` info, `W` onda, `Esc` chiudi.
