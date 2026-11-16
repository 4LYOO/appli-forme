# Simulations sur 8 semaines (données fictives)

Généré par `node tools/simulate.mjs --write`. Point de départ commun : 58 kg, objectif initial 2890 kcal (maintenance estimée par la formule : 2510 kcal). Le poids « mesuré » = poids réel + bruit quotidien de ±0,35 kg (eau, digestion). Apports quotidiens bruités de ±250 kcal.

Colonnes : **dépense estimée** par l'appli (confiance), **objectif** de la semaine suivante (variation), **rythme** mesuré sur 14 jours, **diagnostic** de stagnation.

## 1. Régulier (dépense réelle 3 000 kcal)

Dépense réelle simulée : 3000 kcal.

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 57,9 | 58,1 | – | 2510 (aucune, 7 j, 7 pesées) | 2890 | – |
| 2 | 57,8 | 57,8 | -0,38 | 2982 (moyenne, 14 j, 14 pesées) | 3140 (+250) | Stagnation → depense |
| 3 | 57,9 | 57,8 | +0,24 | 3024 (bonne, 21 j, 21 pesées) | 3350 (+210) | OK |
| 4 | 58,2 | 57,9 | +0,21 | 3007 (bonne, 28 j, 28 pesées) | 3350 | OK |
| 5 | 58,5 | 58,1 | +0,19 | 2975 (bonne, 28 j, 28 pesées) | 3350 | OK |
| 6 | 58,8 | 58,3 | +0,45 | 3004 (bonne, 28 j, 28 pesées) | 3350 | OK |
| 7 | 59,1 | 58,8 | +0,51 | 2940 (bonne, 28 j, 28 pesées) | 3270 (-80) | Trop rapide |
| 8 | 59,3 | 59,0 | +0,22 | 2910 (bonne, 28 j, 28 pesées) | 3270 | OK |

Action proposée (semaine 2) : « Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu'estimé. +150 à 200 kcal/j, de préférence en collation dense. »

Bilan : 1,3 kg en 8 semaines ; dépense estimée finale 2910 kcal pour 3000 réels (écart -3,0 %).

## 2. Dépense sous-estimée (réelle 3 300 kcal) → stagnation

Dépense réelle simulée : 3300 kcal.

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 57,6 | 57,6 | – | 2510 (aucune, 7 j, 7 pesées) | 2890 | – |
| 2 | 57,0 | 57,4 | -0,41 | 2922 (moyenne, 14 j, 14 pesées) | 3140 (+250) | Stagnation → depense |
| 3 | 56,8 | 57,1 | -0,48 | 3162 (bonne, 21 j, 21 pesées) | 3390 (+250) | Stagnation → apport |
| 4 | 56,9 | 57,0 | -0,06 | 3253 (bonne, 28 j, 28 pesées) | 3580 (+190) | Stagnation → depense |
| 5 | 57,2 | 57,1 | +0,10 | 3256 (bonne, 28 j, 28 pesées) | 3580 | Stagnation → depense |
| 6 | 57,4 | 57,2 | +0,14 | 3249 (bonne, 28 j, 28 pesées) | 3580 | Stagnation → depense |
| 7 | 57,7 | 57,4 | +0,27 | 3285 (bonne, 28 j, 28 pesées) | 3580 | OK |
| 8 | 58,0 | 57,6 | +0,32 | 3317 (bonne, 28 j, 28 pesées) | 3650 (+70) | OK |

Action proposée (semaine 2) : « Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu'estimé. +150 à 200 kcal/j, de préférence en collation dense. »

Bilan : 0,0 kg en 8 semaines ; dépense estimée finale 3317 kcal pour 3300 réels (écart 0,5 %).

## 3. Apports insuffisants (mange 85 % de l'objectif)

Dépense réelle simulée : 3000 kcal.

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 57,5 | 57,5 | – | 2510 (aucune, 7 j, 7 pesées) | 2890 | – |
| 2 | 57,2 | 57,4 | -0,31 | 2739 (moyenne, 14 j, 14 pesées) | 3070 (+180) | Stagnation → apport |
| 3 | 56,9 | 57,1 | -0,40 | 2842 (bonne, 21 j, 21 pesées) | 3170 (+100) | Stagnation → apport |
| 4 | 56,5 | 56,9 | -0,09 | 2889 (bonne, 28 j, 28 pesées) | 3170 | Stagnation → apport |
| 5 | 56,4 | 56,7 | -0,17 | 2936 (bonne, 28 j, 28 pesées) | 3270 (+100) | Stagnation → apport |
| 6 | 56,1 | 56,5 | -0,23 | 2886 (bonne, 28 j, 28 pesées) | 3270 | Stagnation → apport |
| 7 | 55,8 | 56,2 | -0,40 | 2948 (bonne, 28 j, 28 pesées) | 3270 | Stagnation → apport |
| 8 | 55,6 | 55,9 | -0,23 | 3049 (bonne, 28 j, 28 pesées) | 3380 (+110) | Stagnation → apport |

Action proposée (semaine 2) : « Tes apports sont à 88 % de l'objectif. Plutôt que manger plus aux repas, ajoute une collation dense et facile (ex. smoothie lait-banane-avoine-beurre de cacahuète, ≈ 600 kcal). »

Bilan : -2,4 kg en 8 semaines ; dépense estimée finale 3049 kcal pour 3000 réels (écart 1,6 %).

## 4. Jours non saisis (35 % de jours incomplets, 4 pesées/sem)

Dépense réelle simulée : 3000 kcal.

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 57,8 | 58,1 | – | 2510 (aucune, 6 j, 5 pesées) | 2890 | – |
| 2 | 57,5 | 57,5 | -0,66 | 2594 (faible, 10 j, 9 pesées) | 2890 | Stagnation → depense |
| 3 | 57,5 | 57,3 | +0,13 | 2790 (moyenne, 15 j, 16 pesées) | 3120 (+230) | Stagnation → saisie |
| 4 | 57,7 | 57,5 | +0,44 | 2894 (bonne, 21 j, 22 pesées) | 3220 (+100) | OK |
| 5 | 57,9 | 57,7 | +0,09 | 2832 (bonne, 21 j, 20 pesées) | 3220 | Stagnation → depense |
| 6 | 57,9 | 57,7 | -0,05 | 2892 (bonne, 20 j, 21 pesées) | 3220 | Stagnation → saisie |
| 7 | 58,1 | 58,1 | +0,47 | 2988 (bonne, 18 j, 16 pesées) | 3320 (+100) | OK |
| 8 | 58,5 | 58,1 | -0,06 | 3030 (moyenne, 15 j, 15 pesées) | 3320 | Stagnation → saisie |

Action proposée (semaine 2) : « Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu'estimé. +150 à 200 kcal/j, de préférence en collation dense. »

Bilan : 0,5 kg en 8 semaines ; dépense estimée finale 3030 kcal pour 3000 réels (écart 1,0 %).

## 5. Sous-déclaration constante (note 85 % de ce qu'il mange)

Dépense réelle simulée : 3000 kcal (soit 2550 kcal « en unités saisies »).

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 58,3 | 58,1 | – | 2510 (aucune, 7 j, 7 pesées) | 2890 | – |
| 2 | 58,6 | 58,4 | +0,55 | 2348 (moyenne, 14 j, 14 pesées) | 2890 | Trop rapide |
| 3 | 59,0 | 58,6 | +0,35 | 2399 (bonne, 21 j, 21 pesées) | 2740 (-150) | OK |
| 4 | 59,1 | 58,8 | +0,39 | 2410 (bonne, 28 j, 28 pesées) | 2740 | OK |
| 5 | 59,2 | 59,1 | +0,22 | 2442 (bonne, 28 j, 28 pesées) | 2740 | OK |
| 6 | 59,4 | 59,2 | +0,02 | 2468 (bonne, 28 j, 28 pesées) | 2740 | Stagnation → depense |
| 7 | 59,6 | 59,3 | -0,03 | 2537 (bonne, 28 j, 28 pesées) | 2870 (+130) | Stagnation → depense |
| 8 | 59,8 | 59,3 | -0,05 | 2634 (bonne, 28 j, 28 pesées) | 2960 (+90) | Stagnation → depense |

Action proposée (semaine 6) : « Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu'estimé. +150 à 200 kcal/j, de préférence en collation dense. »

Bilan : 1,8 kg en 8 semaines ; dépense estimée finale 2634 kcal pour 2550 réels (écart 3,3 %).

## 6. Mauvais sommeil semaines 4-5 (et mange 90 %)

Dépense réelle simulée : 3000 kcal.

| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |
|---|---|---|---|---|---|---|
| 1 | 57,9 | 57,4 | – | 2510 (aucune, 7 j, 7 pesées) | 2890 | – |
| 2 | 57,9 | 57,7 | +0,31 | 2559 (moyenne, 14 j, 14 pesées) | 2890 | OK |
| 3 | 57,7 | 57,8 | -0,01 | 2647 (bonne, 21 j, 21 pesées) | 2980 (+90) | Stagnation → depense |
| 4 | 57,4 | 57,7 | -0,32 | 2749 (bonne, 28 j, 28 pesées) | 3080 (+100) | Stagnation → apport |
| 5 | 57,0 | 57,4 | -0,65 | 2942 (bonne, 28 j, 28 pesées) | 3270 (+190) | Stagnation → apport |
| 6 | 57,2 | 57,2 | -0,08 | 3083 (bonne, 28 j, 28 pesées) | 3410 (+140) | Stagnation → apport |
| 7 | 57,6 | 57,2 | +0,13 | 3120 (bonne, 28 j, 28 pesées) | 3410 | Stagnation → depense |
| 8 | 57,9 | 57,4 | +0,25 | 3039 (bonne, 28 j, 28 pesées) | 3410 | OK |

Action proposée (semaine 3) : « Tu manges ce qui est prévu mais le poids ne bouge pas : ta dépense est plus haute qu'estimé. +150 à 200 kcal/j, de préférence en collation dense. »

Bilan : -0,1 kg en 8 semaines ; dépense estimée finale 3039 kcal pour 3000 réels (écart 1,3 %).

## 7. Score du jour sur 8 semaines (nuits mauvaises en semaines 4-5)

| Sem. | Score moyen | Week-end : recommandations | Semaine : recommandations |
|---|---|---|---|
| 1 | 76 | Complète ×2 | Mini ×5 |
| 2 | 73 | Complète ×2 | Mini ×5 |
| 3 | 69 | Complète ×2 | Mobilité ×2, Mini ×3 |
| 4 (mauvais sommeil) | 42 | Repos ×1, Mobilité ×1 | Mobilité ×3, Repos ×2 |
| 5 (mauvais sommeil) | 38 | Mobilité ×2 | Repos ×4, Mobilité ×1 |
| 6 | 75 | Complète ×2 | Mini ×4, Mobilité ×1 |
| 7 | 78 | Complète ×2 | Mini ×5 |
| 8 | 65 | Complète ×1, Allégée ×1 | Mini ×2, Mobilité ×3 |

## 8. Progression des pompes sur 16 séances de week-end

Modèle : capacité maximale qui progresse d'environ 0,7 répétition par séance, −15 % pendant les semaines de mauvais sommeil (séances 7 à 10) ; l'utilisateur s'arrête à 1-2 répétitions en réserve, fatigue de −1 répétition par série. Une stagnation est ajoutée sur les séances 12 à 14.

| Séance | Niveau | Répétitions (4 séries) | Décision pour la suivante |
|---|---|---|---|
| 1 | 4. Pompes | 10 · 9 · 8 · 7 | continuer : Vise 11 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 2 | 4. Pompes | 10 · 9 · 8 · 7 | continuer : Vise 11 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 3 | 4. Pompes | 11 · 10 · 9 · 8 | continuer : Vise 12 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 4 | 4. Pompes | 12 · 11 · 10 · 9 | continuer : Vise 13 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 5 | 4. Pompes | 12 · 11 · 10 · 9 | continuer : Vise 13 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 6 | 4. Pompes | 13 · 12 · 11 · 10 | continuer : Vise 14 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 7 (sommeil) | 4. Pompes | 11 · 10 · 9 · 8 | maintenir : Baisse probablement liée à la fatigue (nuit ou score du jour) : on garde la même cible, rien d'inquiétant. |
| 8 (sommeil) | 4. Pompes | 12 · 11 · 10 · 9 | continuer : Vise 13 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 9 (sommeil) | 4. Pompes | 13 · 12 · 11 · 10 | continuer : Vise 14 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 10 (sommeil) | 4. Pompes | 13 · 12 · 11 · 10 | continuer : Vise 14 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 11 | 4. Pompes | 15 · 15 · 14 · 13 | continuer : Vise 15 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 12 (plateau) | 4. Pompes | 16 · 16 · 15 · 14 | continuer : Vise 15 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 13 (plateau) | 4. Pompes | 16 · 16 · 15 · 14 | continuer : Vise 15 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 14 (plateau) | 4. Pompes | 16 · 16 · 15 · 14 | varier : Pas de progrès depuis 3 séances : garde le niveau mais descends en 3 s (tempo lent), ou essaie la variante suivante sur 1 série. |
| 15 | 4. Pompes | 17 · 16 · 15 · 14 | continuer : Vise 15 répétitions par série (au moins une de plus que la dernière fois sur une série). |
| 16 | 4. Pompes | 16 · 16 · 16 · 15 | monter : Toutes tes séries ont atteint 15 : passe à « Pompes déclinées (pieds sur une chaise) », vise 7 répétitions. |

Lecture : la montée de niveau ne se déclenche que quand les 4 séries atteignent le haut de la fourchette ; pendant le mauvais sommeil la cible reste stable (pas de montée forcée) ; un plateau de 3 séances déclenche « varier » (tempo lent ou variante).
