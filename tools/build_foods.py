"""Génère data/foods.json (valeurs de départ saisies à la main).

ATTENTION : relancer ensuite `python3 tools/ciqual_extract.py <table Ciqual>` pour remettre les valeurs officielles Ciqual.

Valeurs pour 100 g : kcal, protéines (p), glucides (g), lipides (l).
STATUT : valeurs moyennes proches de la table Ciqual (ANSES), saisies à la main car le site
ciqual.anses.fr était en maintenance le 16/11/2026. À remplacer par l'extrait officiel
(tools/ciqual_extract.py, phase 2) dès que le fichier est téléchargeable.

Identifiants = nom simplifié (stables : ne pas renommer un aliment existant sans garder l'ancien id).
Portions : les grammes sont cachés derrière des portions visuelles (petite/normale/grosse, 1 pot, 1 poignée…).
"""
import json, pathlib, re, unicodedata

def slug(name):
  n = unicodedata.normalize('NFD', name.lower())
  n = ''.join(c for c in n if unicodedata.category(c) != 'Mn').replace('œ', 'oe')
  return re.sub(r'[^a-z0-9]+', '-', n).strip('-')[:48]

PT = {
  # accompagnements cuits (riz, pâtes, semoule…) : « normale » ≈ 1,5 poing ≈ 70-80 g cru
  'feculent': [['Petite assiette', 120], ['Assiette normale', 200], ['Grosse assiette', 300]],
  'legumineuse': [['Petite portion', 80], ['Portion normale', 150], ['Grosse portion', 250]],
  'legume': [['Petite portion', 80], ['Portion normale', 150], ['Grosse portion', 250]],
  'plat': [['Petite part', 200], ['Part normale', 300], ['Grosse part', 450]],
  'fromage': [['Petit morceau', 20], ['1 part', 30], ['Grosse part', 50]],
  'oleagineux': [['Petite poignée', 20], ['1 poignée', 30], ['Grosse poignée', 45]],
  'tartiner': [['1 c. à café', 8], ['1 c. à soupe', 16], ['2 c. à soupe', 32]],
  'huile': [['1 c. à café', 5], ['1 c. à soupe', 10], ['2 c. à soupe', 20]],
  'cereales_bol': [['Petit bol', 40], ['Bol', 60], ['Grand bol', 90]],
  'boisson': [['1 petit verre (150 ml)', 150], ['1 verre (250 ml)', 250], ['1 bol / grand verre (350 ml)', 350]],
  'fruit_sec': [['Petite poignée', 20], ['1 poignée', 35], ['Grosse poignée', 50]],
  'sauce': [['1 c. à soupe', 15], ['Petite portion', 50], ['Portion', 100]],
}

# catégorie, nom, kcal, p, g, l, portions (type ou liste [libellé, grammes]), tags
F = [
 # Féculents
 ('Féculents', 'Riz blanc cuit', 140, 2.7, 30.5, 0.5, 'feculent', ''),
 ('Féculents', 'Riz complet cuit', 140, 3.2, 28.5, 1.0, 'feculent', ''),
 ('Féculents', 'Pâtes cuites', 150, 5.4, 29.5, 0.9, 'feculent', ''),
 ('Féculents', 'Pâtes complètes cuites', 145, 5.5, 27, 1.2, 'feculent', ''),
 ('Féculents', 'Semoule de couscous cuite', 115, 3.8, 23, 0.6, 'feculent', ''),
 ('Féculents', 'Quinoa cuit', 120, 4.4, 21, 1.9, 'feculent', ''),
 ('Féculents', 'Boulgour cuit', 95, 3.2, 18.5, 0.4, 'feculent', ''),
 ('Féculents', 'Pommes de terre cuites à l\'eau', 80, 2, 17, 0.1, 'feculent', ''),
 ('Féculents', 'Purée de pommes de terre (lait, beurre)', 95, 2, 13, 3.8, 'feculent', ''),
 ('Féculents', 'Patate douce cuite', 90, 1.6, 20, 0.2, 'feculent', ''),
 ('Féculents', 'Frites au four', 165, 2.6, 26, 5.2, 'feculent', ''),
 ('Féculents', 'Gnocchis cuits', 135, 3.2, 29, 0.4, 'feculent', ''),
 ('Féculents', 'Riz cru (pour les préparations)', 355, 7, 78, 0.6, [['1 personne (75 g)', 75], ['½ paquet (500 g)', 500], ['1 paquet (1 kg)', 1000]], ''),
 ('Féculents', 'Pâtes sèches (pour les préparations)', 355, 12.5, 70, 1.5, [['1 personne (90 g)', 90], ['½ paquet (250 g)', 250], ['1 paquet (500 g)', 500]], ''),
 ('Légumineuses', 'Lentilles sèches (pour les préparations)', 330, 24, 48, 1.5, [['1 personne (60 g)', 60], ['½ paquet (250 g)', 250], ['1 paquet (500 g)', 500]], 'proteine'),
 ('Légumineuses', 'Pois chiches en boîte (égouttés)', 150, 8.3, 20, 2.6, [['½ boîte (130 g)', 130], ['1 boîte (265 g)', 265]], 'proteine'),
 ('Légumineuses', 'Haricots rouges en boîte (égouttés)', 115, 9, 13, 0.5, [['½ boîte (125 g)', 125], ['1 boîte (250 g)', 250]], 'proteine'),
 ('Féculents', 'Flocons d\'avoine', 370, 13, 58, 7, 'cereales_bol', 'dense'),
 ('Féculents', 'Muesli', 370, 9, 62, 7, 'cereales_bol', ''),
 ('Féculents', 'Granola', 450, 9, 62, 18, 'cereales_bol', 'dense'),
 ('Féculents', 'Céréales du petit-déjeuner (pétales de maïs)', 380, 7, 84, 0.9, 'cereales_bol', ''),
 # Pains
 ('Pains', 'Baguette', 275, 8.7, 56, 1.3, [['1 morceau (¼ baguette)', 60], ['½ baguette', 125], ['1 baguette', 250]], ''),
 ('Pains', 'Pain complet', 245, 9, 43, 2.3, [['1 tranche', 35], ['2 tranches', 70], ['3 tranches', 105]], ''),
 ('Pains', 'Pain de mie', 270, 8, 48, 4, [['1 tranche', 25], ['2 tranches', 50], ['4 tranches', 100]], ''),
 ('Pains', 'Pain de mie complet', 255, 9, 44, 4, [['1 tranche', 25], ['2 tranches', 50], ['4 tranches', 100]], ''),
 ('Pains', 'Tortilla de blé (wrap)', 310, 8.5, 52, 7, [['1 wrap', 60], ['2 wraps', 120]], ''),
 ('Pains', 'Croissant', 420, 8, 45, 22, [['1 croissant', 60], ['2 croissants', 120]], 'dense'),
 ('Pains', 'Pain au chocolat', 420, 7, 47, 22, [['1 pain au chocolat', 70], ['2', 140]], 'dense'),
 ('Pains', 'Biscottes', 410, 11, 72, 7, [['2 biscottes', 16], ['4 biscottes', 32]], ''),
 # Légumineuses
 ('Légumineuses', 'Lentilles vertes cuites', 125, 10, 17, 0.6, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Lentilles corail cuites', 115, 9, 18, 0.5, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Pois chiches cuits', 150, 8.3, 20, 2.6, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Haricots rouges cuits', 115, 9, 13, 0.5, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Haricots blancs cuits', 110, 7.5, 14, 0.6, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Pois cassés cuits', 120, 8.5, 18, 0.4, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Edamame (fèves de soja)', 125, 11, 8, 5, 'legumineuse', 'proteine'),
 ('Légumineuses', 'Houmous', 300, 7.5, 13, 24, [['2 c. à soupe', 30], ['Petit pot (½)', 100], ['1 pot', 200]], 'dense'),
 ('Légumineuses', 'Falafels', 330, 13, 30, 18, [['3 falafels', 60], ['5 falafels', 100], ['8 falafels', 160]], ''),
 # Soja et alternatives
 ('Soja & alternatives', 'Tofu ferme nature', 125, 13, 1.5, 7.5, [['¼ bloc', 50], ['½ bloc', 100], ['1 bloc', 200]], 'proteine'),
 ('Soja & alternatives', 'Tofu fumé', 170, 16, 2, 11, [['¼ bloc', 50], ['½ bloc', 100], ['1 bloc', 200]], 'proteine'),
 ('Soja & alternatives', 'Tempeh', 190, 19, 9, 11, [['¼ bloc', 50], ['½ bloc', 100], ['1 bloc', 200]], 'proteine'),
 ('Soja & alternatives', 'Seitan', 120, 21, 5, 2, [['Petite portion', 80], ['Portion', 120], ['Grosse portion', 180]], 'proteine'),
 ('Soja & alternatives', 'Steak végétal (soja)', 200, 16, 8, 11, [['1 steak', 100], ['2 steaks', 200]], 'proteine'),
 ('Soja & alternatives', 'Protéines de soja texturées (sèches)', 330, 50, 15, 1.5, [['Petite portion', 30], ['Portion', 50], ['Grosse portion', 75]], 'proteine'),
 ('Soja & alternatives', 'Boisson au soja', 42, 3.6, 2, 1.9, 'boisson', ''),
 ('Soja & alternatives', 'Yaourt au soja nature', 50, 4, 2, 2.3, [['1 pot', 125], ['2 pots', 250]], ''),
 # Œufs
 ('Œufs', 'Œuf dur ou à la coque', 140, 12.5, 0.5, 9.8, [['1 œuf', 50], ['2 œufs', 100], ['3 œufs', 150], ['4 œufs', 200]], 'proteine'),
 ('Œufs', 'Œuf au plat', 190, 13, 0.6, 15, [['1 œuf', 50], ['2 œufs', 100], ['3 œufs', 150]], 'proteine'),
 ('Œufs', 'Omelette nature (avec matière grasse)', 170, 11, 0.8, 13.5, [['2 œufs', 110], ['3 œufs', 165], ['4 œufs', 220]], 'proteine'),
 ('Œufs', 'Œufs brouillés', 165, 11, 1.5, 12.5, [['2 œufs', 110], ['3 œufs', 165], ['4 œufs', 220]], 'proteine'),
 # Produits laitiers
 ('Produits laitiers', 'Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 'boisson', ''),
 ('Produits laitiers', 'Lait entier', 65, 3.2, 4.8, 3.6, 'boisson', 'dense'),
 ('Produits laitiers', 'Lait chocolaté', 75, 3.2, 10, 2.3, 'boisson', ''),
 ('Produits laitiers', 'Skyr nature', 62, 10.5, 3.8, 0.2, [['1 pot', 150], ['Grand pot (½)', 225], ['Grand pot entier', 450]], 'proteine'),
 ('Produits laitiers', 'Fromage blanc 3 %', 76, 7.3, 4, 3.2, [['1 petit pot', 100], ['1 bol', 200], ['Grand bol', 300]], 'proteine'),
 ('Produits laitiers', 'Fromage blanc 0 %', 46, 7.5, 4, 0.2, [['1 petit pot', 100], ['1 bol', 200], ['Grand bol', 300]], 'proteine'),
 ('Produits laitiers', 'Yaourt nature', 62, 4.2, 5.4, 2.4, [['1 pot', 125], ['2 pots', 250]], ''),
 ('Produits laitiers', 'Yaourt à la grecque', 120, 5, 4, 10, [['1 pot', 150], ['2 pots', 300]], 'dense'),
 ('Produits laitiers', 'Petits-suisses nature', 110, 9, 3.5, 7, [['2 petits-suisses', 120], ['4 petits-suisses', 240]], 'proteine'),
 ('Produits laitiers', 'Crème dessert chocolat', 130, 3.4, 20, 3.5, [['1 pot', 125]], ''),
 ('Produits laitiers', 'Protéine en poudre (whey)', 380, 78, 7, 5, [['1 dose', 30], ['2 doses', 60]], 'proteine'),
 # Fromages
 ('Fromages', 'Emmental / fromage râpé', 380, 28, 0, 30, 'fromage', 'dense proteine'),
 ('Fromages', 'Comté', 410, 27, 0, 34, 'fromage', 'dense proteine'),
 ('Fromages', 'Mozzarella', 250, 18, 1.5, 19, [['¼ boule', 30], ['½ boule', 60], ['1 boule', 125]], 'proteine'),
 ('Fromages', 'Feta', 270, 14.5, 1, 23, 'fromage', ''),
 ('Fromages', 'Camembert', 270, 20, 0.5, 21, 'fromage', ''),
 ('Fromages', 'Chèvre frais', 200, 11, 2.5, 16, 'fromage', ''),
 ('Fromages', 'Fromage fondu (portion)', 240, 11, 6, 19, [['1 portion', 17], ['2 portions', 34]], ''),
 # Oléagineux
 ('Oléagineux & graines', 'Amandes', 630, 21, 7, 53, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Noix', 700, 15, 7, 66, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Noix de cajou', 595, 19, 27, 46, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Cacahuètes grillées', 620, 25, 9, 50, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Noisettes', 650, 15, 7, 62, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Mélange fruits secs et oléagineux', 480, 13, 40, 30, 'oleagineux', 'dense emporter'),
 ('Oléagineux & graines', 'Beurre de cacahuète', 630, 25, 14, 50, 'tartiner', 'dense'),
 ('Oléagineux & graines', 'Purée d\'amande', 640, 23, 6, 54, 'tartiner', 'dense'),
 ('Oléagineux & graines', 'Graines de courge', 580, 30, 5, 47, [['1 c. à soupe', 10], ['Petite poignée', 20]], 'dense'),
 ('Oléagineux & graines', 'Graines de chia', 480, 17, 8, 31, [['1 c. à soupe', 12], ['2 c. à soupe', 24]], ''),
 # Fruits
 ('Fruits', 'Banane', 90, 1.2, 20, 0.3, [['1 banane', 120], ['2 bananes', 240]], 'emporter'),
 ('Fruits', 'Pomme', 53, 0.3, 11.6, 0.2, [['1 pomme', 150], ['2 pommes', 300]], 'emporter'),
 ('Fruits', 'Orange', 45, 0.9, 9, 0.2, [['1 orange', 150]], ''),
 ('Fruits', 'Clémentine', 45, 0.8, 9, 0.2, [['1 clémentine', 60], ['3 clémentines', 180]], 'emporter'),
 ('Fruits', 'Kiwi', 60, 1, 11, 0.6, [['1 kiwi', 75], ['2 kiwis', 150]], ''),
 ('Fruits', 'Fruits rouges (surgelés)', 45, 1, 8, 0.4, [['1 poignée', 80], ['1 bol', 150]], ''),
 ('Fruits', 'Avocat', 200, 1.6, 1.5, 20, [['½ avocat', 75], ['1 avocat', 150]], 'dense'),
 ('Fruits', 'Compote sans sucre ajouté', 65, 0.3, 14, 0.2, [['1 gourde / pot', 90]], 'emporter'),
 ('Fruits', 'Dattes', 290, 2.2, 65, 0.4, [['3 dattes', 25], ['5 dattes', 40], ['3 dattes Medjool', 60]], 'dense emporter'),
 ('Fruits', 'Raisins secs', 300, 3, 67, 0.6, 'fruit_sec', 'dense emporter'),
 ('Fruits', 'Abricots secs', 255, 3.2, 55, 0.5, 'fruit_sec', 'dense emporter'),
 ('Fruits', 'Figues sèches', 260, 3.3, 55, 1.2, 'fruit_sec', 'dense emporter'),
 ('Fruits', 'Jus d\'orange', 45, 0.7, 9.5, 0.1, 'boisson', ''),
 # Légumes
 ('Légumes', 'Légumes variés cuits', 35, 1.8, 5, 0.5, 'legume', ''),
 ('Légumes', 'Poêlée de légumes (avec huile)', 60, 2, 6, 3, 'legume', ''),
 ('Légumes', 'Brocoli cuit', 35, 2.8, 3, 0.5, 'legume', ''),
 ('Légumes', 'Haricots verts cuits', 30, 2, 4, 0.2, 'legume', ''),
 ('Légumes', 'Épinards cuits', 25, 3, 1, 0.5, 'legume', ''),
 ('Légumes', 'Courgette cuite', 18, 1.3, 2, 0.4, 'legume', ''),
 ('Légumes', 'Ratatouille', 60, 1.2, 5, 3.8, 'legume', ''),
 ('Légumes', 'Carottes râpées', 36, 0.8, 7, 0.3, 'legume', ''),
 ('Légumes', 'Tomates', 20, 0.8, 3, 0.3, [['1 tomate', 120], ['2 tomates', 240]], ''),
 ('Légumes', 'Salade verte', 15, 1.2, 1.5, 0.3, [['1 bol', 50]], ''),
 ('Légumes', 'Maïs doux', 100, 3, 16, 1.5, [['Petite boîte (½)', 70], ['Petite boîte', 140]], ''),
 ('Légumes', 'Champignons cuits', 30, 3, 1, 0.8, 'legume', ''),
 ('Légumes', 'Soupe de légumes', 35, 1, 5, 1.2, [['1 bol', 300], ['1 grand bol', 450]], ''),
 # Matières grasses et sauces
 ('Matières grasses & sauces', 'Huile d\'olive', 900, 0, 0, 100, 'huile', 'dense'),
 ('Matières grasses & sauces', 'Huile de colza', 900, 0, 0, 100, 'huile', 'dense'),
 ('Matières grasses & sauces', 'Beurre', 745, 0.7, 0.6, 82, [['1 noisette', 5], ['Pour 1 tartine', 10], ['Généreux', 20]], 'dense'),
 ('Matières grasses & sauces', 'Crème fraîche', 290, 2.3, 3, 30, [['1 c. à soupe', 15], ['2 c. à soupe', 30]], 'dense'),
 ('Matières grasses & sauces', 'Mayonnaise', 700, 1, 2, 77, [['1 c. à soupe', 15]], 'dense'),
 ('Matières grasses & sauces', 'Pesto', 450, 5, 5, 45, [['1 c. à soupe', 15], ['2 c. à soupe', 30]], 'dense'),
 ('Matières grasses & sauces', 'Sauce tomate', 45, 1.5, 7, 1, 'sauce', ''),
 # Sucré
 ('Sucré', 'Chocolat noir 70 %', 580, 8, 33, 43, [['2 carrés', 10], ['1 rangée', 20], ['½ tablette', 50]], 'dense emporter'),
 ('Sucré', 'Chocolat au lait', 545, 7, 56, 32, [['2 carrés', 10], ['1 rangée', 20], ['½ tablette', 50]], 'dense emporter'),
 ('Sucré', 'Barre de céréales', 410, 6, 66, 13, [['1 barre', 25], ['2 barres', 50]], 'emporter'),
 ('Sucré', 'Biscuits secs (type petit-beurre)', 450, 7.5, 74, 12, [['2 biscuits', 16], ['4 biscuits', 32], ['8 biscuits', 64]], 'emporter'),
 ('Sucré', 'Gâteau type quatre-quarts', 430, 6, 50, 23, [['1 tranche', 50], ['2 tranches', 100]], 'dense emporter'),
 ('Sucré', 'Pâte à tartiner chocolat-noisette', 540, 6, 57, 31, 'tartiner', 'dense'),
 ('Sucré', 'Miel', 325, 0.4, 80, 0, [['1 c. à café', 7], ['1 c. à soupe', 20]], ''),
 ('Sucré', 'Confiture', 260, 0.5, 63, 0.2, [['1 c. à café', 10], ['1 c. à soupe', 20]], ''),
 ('Sucré', 'Sucre', 400, 0, 100, 0, [['1 morceau / c. à café', 5]], ''),
 ('Sucré', 'Soda', 42, 0, 10.5, 0, [['1 canette', 330]], ''),
 # Boissons chaudes
 ('Boissons', 'Café noir', 2, 0.1, 0.3, 0, [['1 tasse', 100], ['1 mug', 250]], ''),
 ('Boissons', 'Café au lait (lait demi-écrémé)', 25, 1.7, 2.5, 0.8, [['1 tasse', 200], ['1 bol', 300], ['1 grand bol', 400]], ''),
 ('Boissons', 'Thé ou tisane', 1, 0, 0.2, 0, [['1 tasse', 250]], ''),
 ('Boissons', 'Chocolat chaud au lait', 80, 3.4, 11, 2.4, [['1 tasse', 200], ['1 bol', 300]], ''),
 # Plats
 ('Plats', 'Pizza margherita', 245, 10, 30, 9, [['¼ pizza', 100], ['½ pizza', 200], ['1 pizza', 400]], ''),
 ('Plats', 'Quiche aux légumes', 250, 7, 18, 16, [['1 part', 150], ['2 parts', 300]], ''),
 ('Plats', 'Lasagnes végétariennes', 130, 6, 12, 6, 'plat', ''),
 ('Plats', 'Gratin de pâtes au fromage', 170, 7, 19, 7, 'plat', ''),
 ('Plats', 'Dahl de lentilles', 130, 6, 15, 5, 'plat', 'proteine'),
 ('Plats', 'Chili sin carne', 110, 6, 14, 3, 'plat', 'proteine'),
 ('Plats', 'Curry de pois chiches', 140, 5.5, 15, 6, 'plat', ''),
 ('Plats', 'Soupe de lentilles', 70, 4, 10, 1.5, [['1 bol', 300], ['1 grand bol', 450]], ''),
 ('Plats', 'Riz cantonais végétarien', 160, 5, 24, 5, 'plat', ''),
 ('Plats', 'Nouilles sautées aux légumes', 160, 4.5, 24, 5, 'plat', ''),
 ('Plats', 'Taboulé', 180, 3.5, 25, 7, 'plat', ''),
 ('Plats', 'Sandwich fromage (baguette)', 280, 11, 33, 11, [['½ sandwich', 120], ['1 sandwich', 240]], 'emporter'),
 ('Plats', 'Wrap végétarien', 200, 7, 25, 8, [['1 wrap', 180], ['2 wraps', 360]], 'emporter'),
 ('Plats', 'Burrito végétarien', 180, 7, 24, 6, [['1 burrito', 300]], ''),
 ('Plats', 'Maki avocat / légumes', 150, 3, 28, 3, [['6 makis', 150], ['12 makis', 300]], ''),
]

foods = []
for i, (cat, name, kcal, p, g, l, pt, tags) in enumerate(F):
  portions = PT[pt] if isinstance(pt, str) else pt
  foods.append({'id': slug(name), 'cat': cat, 'name': name, 'kcal': kcal, 'p': p, 'g': g, 'l': l,
                'portions': [{'label': a, 'g': b} for a, b in portions], 'tags': tags.split()})

out = {
  'version': 1,
  'source': 'Valeurs moyennes proches de la table Ciqual (ANSES), provisoires — à remplacer par l\'extrait officiel.',
  'provisional': True,
  'foods': foods,
}
pathlib.Path(__file__).resolve().parent.parent.joinpath('data', 'foods.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
assert len({f['id'] for f in foods}) == len(foods), 'identifiants en double'
print(len(foods), 'aliments')
