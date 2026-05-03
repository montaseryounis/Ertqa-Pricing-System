# tool_reference.md — مرجع API للـ15 أداة

> هذا المرجع يُرفع إلى **Code Interpreter** في Agent Builder.
> الوكيل يقرأه عند الحاجة بدل حفظه في system prompt.
> القراءة: `with open("/mnt/data/tool_reference.md") as f: print(f.read())`

---

## مفاتيح القراءة من النتيجة (مهم!)

```python
per   = r.get("تكلفة/قطعة") or r.get("تكلفة/بوكس") or r.get("تكلفة/شيت")
total = r["تكلفة الإجمالي"]
detail = (r.get("تفصيل التكلفة/قطعة")
          or r.get("تفصيل التكلفة/بوكس")
          or r.get("إجماليات البنود"))
```

| الأداة | مفتاح الفرد |
|---|---|
| metal, acrylic, natural_wood, print_3d, roll_print, laser_engraving, uv_print, stamp | `تكلفة/قطعة` |
| mdf_leather_box, cardboard_cutting, wrapping, foam, full_box | `تكلفة/بوكس` |
| paper | `تكلفة/شيت` |
| crystal_shield, full_trophy | `تكلفة/قطعة` |

---

## 1. metal.py

```python
calculate_metal_cost(
    shape_type,        # ⚠️ shape_type وليس shape!
    material_type,     # ⚠️ material_type وليس metal_type!
    thickness_mm,
    L_cm=0.0, W_cm=0.0, H_cm=0.0,
    quantity=1,
    finish=None,             # للأستيل فقط
    diameter_cm=0.0,         # للدوائر
    n_sides=0, side_cm=0.0,
    side_a_cm=0.0, side_b_cm=0.0, side_c_cm=0.0,
    plating_type=None,       # "gold" | "silver"
    plating_minutes=20.0,
    cosmetic_finish=False,   # ⚠️ True للبوية
)
```

- `shape_type`: `flat | box6 | box5 | circle | ellipse | donut | polygon | triangle | rounded_rect | custom`
- `material_type`: `نحاس | أستيل | حديد أسود | ألمنيوم`
- `finish` (للأستيل): `"فضي مرايا" | "فضي مجلوخ" | "ذهبي مرايا" | "ذهبي مجلوخ"`
- **البوية** = `cosmetic_finish=True` (وليس `finish`)
- **الطلاء** = `plating_type="gold"/"silver"`

**مثال:** دائرة نحاس قطر 18 + بوية → 167.86 ر

```python
calculate_metal_cost(
    shape_type="circle", material_type="نحاس", thickness_mm=4,
    diameter_cm=18, quantity=1, cosmetic_finish=True,
)
```

**أخطاء شائعة:**
- ❌ `metal_type=` → ✅ `material_type=`
- ❌ `shape=` → ✅ `shape_type=`
- ❌ `L_cm=18, W_cm=18` للدائرة → ✅ `diameter_cm=18`
- ❌ `finish="painted"` → ✅ `cosmetic_finish=True`

---

## 2. acrylic.py

```python
calculate_acrylic_cost(
    shape_type,
    L_cm=0.0, W_cm=0.0, H_cm=0.0,
    thickness_mm=3.0,
    color="transparent",
    quantity=1,
    diameter_cm=0.0,
    n_sides=0, side_cm=0.0,
    side_a_cm=0.0, side_b_cm=0.0, side_c_cm=0.0,
)
```

- `color` المتاحة فقط: `transparent | black | black_large | matt_black | opal | multicolor`
- `multicolor` للسماكة 2.8مم فقط
- ❌ `white/red/blue` غير موجود → استخدم `opal/multicolor`

**مثال:** لوحة 40×30×5مم شفاف 20 قطعة → 11.39 ر/قطعة

```python
calculate_acrylic_cost(
    shape_type="flat", L_cm=40, W_cm=30, thickness_mm=5,
    color="transparent", quantity=20,
)
```

---

## 3. natural_wood.py

```python
calculate_natural_wood_cost(
    shape_type=None,
    L_cm=0.0, W_cm=0.0, H_cm=0.0,
    wall_thickness_mm=12,
    wood_type="زان",
    quantity=1,
    diameter_cm=0.0,
    finish_type=None,        # "طبقة_تجميلية" | "دهان" | None
    magnet_qty=0,
)
```

- `wood_type` المتاحة فقط: `ماغنو | زان | سنديان | جوز`
- ❌ `بلوط` → ✅ `سنديان`
- ❌ `صنوبر` → غير موجود

**مثال:** بوكس زان 30×20×10 + 4 مغانط → 67.58 ر

```python
calculate_natural_wood_cost(
    shape_type="box6", L_cm=30, W_cm=20, H_cm=10,
    wall_thickness_mm=12, wood_type="زان", quantity=20,
    finish_type="طبقة_تجميلية", magnet_qty=4,
)
```

---

## 4. mdf_leather_box.py

```python
calculate_mdf_leather_box_cost(
    L_cm, W_cm, H_cm,
    T_mm=None,
    leather_type="ACERO",
    shape="box6",
    quantity=1,
    lock_qty=0, magnet_qty=0,
    handle_qty=0, hinge_qty=0,
)
```

- `T_mm` المتاحة فقط: `3 | 5 | 7 | 12 | 15 | 18 | 20 | 24 | 30`
- ❌ `T_mm=10` → ✅ `T_mm=12`
- المخرج: `r["تكلفة/بوكس"]` (وليس `قطعة`)

**مثال:** MDF 30×20×10 + ACERO + 4 مغانط 100 بوكس → 81.66 ر/بوكس

```python
calculate_mdf_leather_box_cost(
    L_cm=30, W_cm=20, H_cm=10, T_mm=12,
    leather_type="ACERO", shape="box6",
    quantity=100, magnet_qty=4,
)
```

---

## 5. print_3d.py

```python
calculate_3d_print(   # ⚠️ ليس calculate_3d_print_cost!
    length_cm,        # ⚠️ length_cm (ليس L_cm)
    width_cm,         # ⚠️ width_cm (ليس W_cm)
    height_cm,        # ⚠️ height_cm (ليس H_cm)
    fill_type,        # solid | sculpture | hollow
    quantity,
    finish_type="none",
    machine_key="kings800",
)
```

**مثال:** تجسيم 20×15×10 صلب 5 قطع → 377.65 ر/قطعة

```python
calculate_3d_print(
    length_cm=20, width_cm=15, height_cm=10,
    fill_type="solid", quantity=5,
)
```

---

## 6. roll_print.py

```python
calculate_roll_print_cost(
    L_cm, W_cm, qty,
    material_key="sticker_white",
    machine_key="ucjv300_uv",
    coverage="graphic",
    has_contour_cut=False,
    bleed_mm=2.0,
)
```

- `material_key`: `sticker_white | sticker_clear | banner | white_film_matte | white_film_glossy | canvas`

**مثال:** 1000 استكر 5×5 + قص شكلي → 0.0739 ر/قطعة

```python
calculate_roll_print_cost(
    L_cm=5, W_cm=5, qty=1000,
    material_key="sticker_white",
    coverage="graphic", has_contour_cut=True,
)
```

---

## 7. laser_engraving_v15_9.py

```python
calculate_laser_engrave_cost(
    engrave_L_cm=0.0, engrave_W_cm=0.0,
    engrave_area_cm2=None,
    material="خشب",     # خشب | أكريليك | معدن | كريستال
    quantity=1,
)
```

- التسعير: ≤10سم² = 0.10 ر/سم² | >10سم² = 0.05 ر/سم²

**مثال:** حفر 8×6 على معدن 100 قطعة → 2.40 ر/قطعة

```python
calculate_laser_engrave_cost(
    engrave_L_cm=8, engrave_W_cm=6,
    material="معدن", quantity=100,
)
```

---

## 8. uv_print.py

```python
calculate_uv_print_cost(
    print_L_cm=None, print_W_cm=None,
    print_area_cm2=None,    # ⚠️ ليس area_cm2!
    quantity=1,
)
```

**مثال:** UV على 1200سم² 20 قطعة → 24 ر/قطعة

```python
calculate_uv_print_cost(print_area_cm2=1200, quantity=20)
```

---

## 9. stamp.py

```python
calculate_stamp_cost(
    L_cm, W_cm, qty,
    stamp_type,   # heat | foil | حرارية | فويل
)
```

⚠️ **القالب (الكليشة) one-time** = المساحة × 4 ر

**مثال:** بصمة فويل 10×6 100 قطعة → 3.90 ر/قطعة

```python
calculate_stamp_cost(L_cm=10, W_cm=6, qty=100, stamp_type="foil")
```

---

## 10. cardboard_cutting.py

```python
calculate_cardboard_cutting(
    box_type="hinged",   # hinged | flip_top | double_door | shoulder | clamshell
    L=30, W=20, H=5, H_lid=3,
    grammage=1500,       # 1000 | 1500 | 2000
    quantity=100,
)
```

---

## 11. paper.py

```python
calculate_paper_cost(
    paper_type="فاخر",        # فاخر | كوشية
    grammage=115,             # 115 | 130 | 150 | 170 | 200 | 250 | 300 | 350
    sheets=100,
    print_method="digital",   # digital | offset | none
    print_sides=2,
    with_lamination=False,
    with_diecut=False,        # ⚠️ يضيف 200 ر قالب one-time
    with_stamp=False,         # ⚠️ يستدعي stamp.py تلقائياً
    stamp_L=None, stamp_W=None,
    stamp_type="حرارية",
    standalone=False,
)
```

⚠️ **قوالب one-time:**
- داي كت = 200 ر ثابتة
- كليشة بصمة = المساحة × 4 ر

---

## 12. wrapping.py

```python
calculate_wrapping_cost(
    box_type="hinged",
    L=30, W=20, H=5, H_lid=3,
    quantity=100,
    method="auto",   # auto | manual | automatic
)
```

---

## 13. foam.py

```python
calculate_foam_cost(
    L=28, W=18,           # ⚠️ L,W (بدون _cm!)
    thickness_cm=1.0,     # 0.5 | 1.0 | 1.5 | 2.0
    with_velvet=True,
    quantity=100,
    num_layers=1,
)
```

---

## 14. main_v15_9_fixed.py — calculate_full_box (~20s)

```python
calculate_full_box(
    box_type, L, W, H, H_lid,
    cardboard_grammage, quantity,
    paper_type="فاخر", paper_grammage=200,
    print_method="none",
    with_stamp=False, stamp_L=None, stamp_W=None,
    stamp_type="حرارية",
    with_foam=False, foam_thickness=1.0, foam_with_velvet=False,
)
```

**مثال:** بوكس هارد كفر 30×25×6+3 + بصمة + فوم → 556.03 ر

```python
calculate_full_box(
    box_type="hinged", L=30, W=25, H=6, H_lid=3,
    cardboard_grammage=2000, quantity=1,
    paper_type="فاخر", paper_grammage=115, print_method="none",
    with_stamp=True, stamp_L=10, stamp_W=6, stamp_type="foil",
    with_foam=True, foam_thickness=1.0, foam_with_velvet=True,
)
```

دوال إضافية في `main_v15_9_fixed.py`:
- `calculate_folder()` — للفولدر/نوت بوك
- `calculate_foam_only()` — فوم منفرد
- `calculate_paper_only()` — ورق منفرد

---

## 15. crystal_shield_v1_1.py

```python
calculate_crystal_shield_cost(
    sheet_key="2.1t",       # 2.1t | 3.1t | 3.0b
    shape_type="rect",      # rect | circle | ellipse | custom
    L_cm=0.0, W_cm=0.0,
    diameter_cm=0.0,
    area_cm2=0.0, perim_cm=0.0,
    quantity=1,
)
```

- `sheet_key`: `2.1t` (شفاف 2.1سم/189ر) | `3.1t` (شفاف 3.1سم/192ر) | `3.0b` (أسود 3.0سم/145ر)
- `shape_type`: `rect` (L+W) | `circle` (diameter) | `ellipse` (L+W) | `custom` (area+perim)

📦 **خصم المعالجة (Lapping) بالكمية تلقائياً:**

| الكمية | ر/قطعة | الخصم |
|---|---|---|
| 1-4 | 50 | 0% |
| 5-9 | 40 | 20% |
| 10-24 | 30 | 40% |
| 25-49 | 20 | 60% |
| 50+ | 15 | 70% |

🔵 **الأشكال الدائرية:** +20 ر رسوم تشكيل ثابتة

**مثال:** درع شفاف دائري قطر 15 50 قطعة → 75.53 ر/قطعة

```python
calculate_crystal_shield_cost(
    sheet_key="2.1t", shape_type="circle",
    diameter_cm=15, quantity=50,
)
```

---

## 16. main_v15_9_fixed.calculate_full_trophy — التروفي المركّب

3 طبقات: درع (إلزامي) + قاعدة (اختياري) + إضافات (اختياري).

```python
calculate_full_trophy(
    # ━━━ الطبقة 1: الدرع ━━━
    shield_sheet_key="2.1t",
    shield_shape="rect",        # rect | circle | ellipse | custom
    shield_L=0, shield_W=0,
    shield_diameter=0,

    # ━━━ الطبقة 2: القاعدة (اختياري) ━━━
    base_type=None,             # None | acrylic | wood | metal | crystal
    base_L=0, base_W=0,
    base_diameter=0,
    base_shape="rect",

    # للأكريليك:
    base_thickness_mm=3.0,
    base_color="transparent",

    # للخشب:
    base_wood_type="زان",
    base_wood_thick_mm=12.0,
    base_wood_finish="طبقة_تجميلية",

    # للمعدن:
    base_metal_type="نحاس",
    base_metal_thick_mm=2.0,
    base_metal_cosmetic=False,

    # للكريستال:
    base_sheet_key="2.1t",

    # ━━━ الطبقة 3: الإضافات (اختياري) ━━━
    with_engraving=False,
    engrave_L=0, engrave_W=0,
    engrave_material="كريستال",

    with_uv=False,
    uv_L=0, uv_W=0,
    uv_area_cm2=0,

    with_stamp=False,
    stamp_L=0, stamp_W=0,
    stamp_type="foil",

    quantity=1,
)
```

**مثال:** درع كرستال شفاف دائري 15 + قاعدة كرستال أسود 15×4 + UV 8×8 + حفر 8×5 — قطعة واحدة → 191.87 ر

```python
calculate_full_trophy(
    shield_sheet_key="2.1t", shield_shape="circle", shield_diameter=15,
    base_type="crystal", base_sheet_key="3.0b", base_L=15, base_W=4,
    with_uv=True, uv_L=8, uv_W=8,
    with_engraving=True, engrave_L=8, engrave_W=5, engrave_material="كريستال",
    quantity=1,
)
```

نفس التروفي 50 قطعة → 121.87 ر/قطعة (إجمالي 6,093.50 ر)

---

## ⚠️ ملخص الأخطاء الشائعة

| الأداة | ❌ خطأ | ✅ صحيح |
|---|---|---|
| metal | `metal_type=` | `material_type=` |
| metal | `shape=` | `shape_type=` |
| metal | `finish="painted"` | `cosmetic_finish=True` |
| metal | `plating_type="gold_flash"` | `plating_type="gold"` |
| acrylic | `color="white"` | `color="opal"` |
| natural_wood | `wood_type="بلوط"` | `wood_type="سنديان"` |
| mdf | `T_mm=10` | `T_mm=12` |
| mdf | `r["تكلفة/قطعة"]` | `r["تكلفة/بوكس"]` |
| print_3d | `calculate_3d_print_cost` | `calculate_3d_print` |
| print_3d | `L_cm=` | `length_cm=` |
| uv_print | `area_cm2=` | `print_area_cm2=` |
| foam | `L_cm, W_cm` | `L, W` |
| foam | `r["تكلفة/قطعة"]` | `r["تكلفة/بوكس"]` |
