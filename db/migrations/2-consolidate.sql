-- The query below consolidates vehicles that have similar names together:

-- Step #1: Change the id in assignments table to smallest id amongst consolidated vehicles

-- Consolidating Van A
update assignments
set vehicle = 6
Where vehicle IN (29, 24, 23, 31);

-- Consolidating Bus B
update assignments
set vehicle = 11
Where vehicle IN (30, 12, 33);

-- Consolidating Van C
update assignments
set vehicle = 14
Where vehicle IN (34);

-- Consolidating Van D
update assignments
set vehicle = 18
Where vehicle IN (27,28,45,32);

-- Consolidating Facilities Truck
update assignments
set vehicle = 39
Where vehicle IN (40);

-- Consolidating Van H
update assignments
set vehicle = 20
Where vehicle IN (37,36);

-- Consolidating Van I
update assignments
set vehicle = 26
Where vehicle IN (38);


-- Step #2: Delete ids that are no longer in use from the vehicles table

DELETE FROM vehicles
WHERE id IN (29, 24, 23, 31, 30, 12, 33, 34, 27,28,45,32,40,37,36,38);

-- Make a table of consolidated vehicles
BEGIN;

-- Table with consolidated cleaned vehicle names, min id of group, & active status
WITH cleaned_vehicles AS (
    SELECT 
        id,
        CASE
            WHEN REPLACE(REPLACE(REPLACE(REPLACE(name, '!', ''), '@', ''), '*', ''), '^', '') IN ('A', 'a') THEN 'Van A' 
            WHEN REPLACE(REPLACE(REPLACE(REPLACE(name, '!', ''), '@', ''), '*', ''), '^', '') IN ('B', 'b') THEN 'Bus B'  
            WHEN REPLACE(REPLACE(REPLACE(REPLACE(name, '!', ''), '@', ''), '*', ''), '^', '') = 'VanD' THEN 'Van D'
            WHEN REPLACE(REPLACE(REPLACE(REPLACE(name, '!', ''), '@', ''), '*', ''), '^', '') IN ('D', 'd', 'D!', 'D*') THEN 'Van D'  
            ELSE REPLACE(REPLACE(REPLACE(REPLACE(name, '!', ''), '@', ''), '*', ''), '^', '')  
        END AS cleaned_name,
        type,
        active
    FROM vehicles 
),
consolidated_vehicles AS (
    SELECT 
        MIN(id) AS id,  -- smallest id from group
        cleaned_name,
        type,
        MAX(active) AS active -- most recent active status
    FROM cleaned_vehicles 
    GROUP BY 
        cleaned_name,  
        type
)

-- Update vehicles with cleaned name / active status
UPDATE vehicles AS v
SET 
    name = cv.cleaned_name,
    active = cv.active
FROM consolidated_vehicles AS cv
WHERE v.id = cv.id;

COMMIT;


-- Unccoment below to see various ids associated with each vehicle

-- Select id 
-- from vehicles
-- Where name like '%Van%A%' or name like 'A%';

-- Select *
-- from vehicles
-- Where name like '%Van%C%' or name like 'C%';

-- Select id 
-- from vehicles
-- Where name like '%Van%D%' or name like 'D%';

-- Select id 
-- from vehicles
-- Where name like '%Facilities%Truck%';

-- Select id 
-- from vehicles
-- Where name like '%Van%H%';

-- Select id 
-- from vehicles
-- Where name like '%Van%I%';