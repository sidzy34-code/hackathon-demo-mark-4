CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION analyze_estate_polygon(geojson jsonb)
RETURNS TABLE (
  area_ha double precision,
  perimeter_m double precision,
  centroid_lat double precision,
  centroid_lon double precision,
  is_valid boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  geom geometry;
  geog geography;
BEGIN
  -- Reconstruct the geometry from the passed GeoJSON
  geom := ST_GeomFromGeoJSON(geojson);
  
  -- Ensure simple validity (e.g. self-intersecting lines drawn by user on map)
  IF NOT ST_IsValid(geom) THEN
    geom := ST_MakeValid(geom);
  END IF;

  -- Create geography for mathematically precise spherical Earth calculations
  geog := geom::geography;

  RETURN QUERY SELECT 
    -- Area in Hectares (1 HA = 10,000 m^2)
    (ST_Area(geog) / 10000.0)::double precision as area_ha,
    -- Perimeter/Boundary in Meters
    ST_Length(ST_Boundary(geog))::double precision as perimeter_m,
    -- Centroid Lat/Lon for Globe flyovers
    ST_Y(ST_Centroid(geom))::double precision as centroid_lat,
    ST_X(ST_Centroid(geom))::double precision as centroid_lon,
    ST_IsValid(geom) as is_valid;
END;
$$;
