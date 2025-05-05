/*
  # Drop companies and locations tables

  1. Changes
    - Drop company_tags table (dependency of companies)
    - Drop locations table (dependency of companies)
    - Drop companies table
  2. Notes
    - Tables are dropped in order to handle foreign key constraints
    - All related data will be removed
*/

-- First drop the company_tags table since it references companies
DROP TABLE IF EXISTS company_tags;

-- Then drop the locations table since it has a foreign key to companies
DROP TABLE IF EXISTS locations;

-- Finally drop the companies table
DROP TABLE IF EXISTS companies;