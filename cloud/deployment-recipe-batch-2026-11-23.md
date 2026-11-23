# Recipe batch 01 deployment

Production Cloudflare workflow should apply `cloud/migrations/0101_meal_recipe_ingredient_quantities_batch_01.sql` after migration 0100, then deploy the Worker.

The batch normalizes explicit amounts for 25 source-tracked draft recipes. It does not mark draft recipes schedulable or alter user food logs.
