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
),

-- Make a mapping table of old ids to new ids, cleaned name, and correct active status
updated_vehicles AS (
    SELECT
        v.id AS old_id,                        
        cv.id AS new_id,                        
        cv.cleaned_name,                        
        cv.active                               
    FROM vehicles v
    JOIN consolidated_vehicles cv
        ON REPLACE(REPLACE(REPLACE(REPLACE(v.name, '!', ''), '@', ''), '*', ''), '^', '') = cv.cleaned_name
        AND v.type = cv.type
)

Select * from updated_vehicles;


-- After this I encounter an issue with updating vehicles to their new ids:
-- In the last step, I created a table with old id mappings to new ones and cleaned names. 
-- I want to update the table of vehicles to switch the old id to the new ids 
-- and the uncleaned name to the cleaned one. However, this vehicles table has a 
-- unique constraint on id and name so I need to collapse data entries together. when i collapse it there are 
-- other tables in the schema with on update cascade that rely on the old values. I'm not sure how to collapse these entries given
-- this uniqueness constraint


