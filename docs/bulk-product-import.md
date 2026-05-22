# Bulk Product Import Guide

This guide explains how to prepare CSV or Excel files for the admin panel bulk product import.

## Supported files

- `.csv`
- `.xlsx`
- `.xls`

Only the first sheet is imported from Excel files.

## Import flow

1. Download the template from the admin panel.
2. Fill one row per product.
3. Keep at least one valid variety per product.
4. Upload the file.
5. Run `Preview import` before `Import products`.

## Required columns

- `name`
- `brand`
- `sku`
- `category`
- `unit`
- `minOrderQuantity`
- `stockQuantity`
- `status`
- `variety1_name`
- `variety1_originalPrice`
- `variety1_discountedPrice`

## Optional columns

- `description`
- `upc`
- `hsnCode`
- `packSizeLabel`
- `stock`
- `shelfLifeDays`
- `storageType`
- `isActive`
- `isFeatured`
- `isBestseller`
- `ratingAverage`
- `ratingCount`
- `seedRatingAverage`
- `seedRatingCount`
- `userRatingAverage`
- `userRatingCount`
- `userRatingTotal`
- `purchaseCount`
- `displayOrder`
- `badges`
- `primaryImage`
- `images`
- additional variety groups such as `variety2_*`, `variety3_*`

## Unit rules

Stored units are:

- `kg`
- `g`
- `l`
- `ml`
- `pcs`
- `packs`
- `boxes`
- `jars`
- `bottles`
- `cans`

The importer is forgiving and will normalize common variants such as:

- `KG`, `kgs`, `kilogram`, `kilo` -> `kg`
- `gram`, `gm`, `gms` -> `g`
- `liter`, `litre`, `ltr` -> `l`
- `milliliter`, `millilitre`, `mls` -> `ml`
- `pc`, `piece`, `pieces`, `unit`, `units` -> `pcs`
- `pack`, `packet` -> `packs`
- `box` -> `boxes`
- `jar` -> `jars`
- `bottle` -> `bottles`
- `can` -> `cans`

If a unit does not match one of the supported values or aliases, preview/import will show `Unit is invalid`.

## Other validation rules

- `sku` must be 3 to 40 characters and use only `A-Z`, `0-9`, `_`, or `-`
- `upc` uses the same character rules as `sku`
- `hsnCode` must be 4 to 8 digits
- `minOrderQuantity` must be at least `1`
- `storageType`, when provided, must be one of `ambient`, `dry`, `chilled`, or `frozen`
- blank `storageType` defaults to `ambient`
- `status` must be `available` or `not available`
- image URLs must be public `http` or `https` URLs
- a product can have at most `5` images
- duplicate SKUs inside the same file are rejected
- SKUs that already exist are rejected

## Category behavior

- If `Auto-create missing categories` is enabled, unmatched categories are created during preview/import
- If it is disabled, unmatched categories fail validation

## Variety format

Each variety uses a numbered column group:

- `variety1_name`
- `variety1_originalPrice`
- `variety1_discountedPrice`
- `variety1_isAvailable`

You can add more groups with the same pattern:

- `variety2_name`
- `variety2_originalPrice`
- `variety2_discountedPrice`
- `variety2_isAvailable`

## Images and badges

- `primaryImage` should be one public URL
- `images` can contain multiple public URLs separated by commas, pipes, or new lines
- `badges` can contain multiple values separated by commas
- if images are omitted, the default product image is used automatically

## Example row

```text
name=Mozzarella Cheese Block
brand=Amul
sku=CHEESE-001
category=DAIRY
unit=KG
packSizeLabel=1 kg block
minOrderQuantity=2
stockQuantity=120
status=available
variety1_name=1 kg block
variety1_originalPrice=420
variety1_discountedPrice=385
```
