import { defineEventHandler } from 'h3'
import pg from 'pg'
const { Pool } = pg

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const pool = new Pool({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbName,
    password: config.dbPassword,
    port: config.dbPort,
  })

  try {
    console.log('Attempting to connect to database...')
    const client = await pool.connect()
    console.log('Connected to database. Executing query...')

    const query = `
      SELECT 
        date_trunc('hour', timestamp) - 
          (EXTRACT(HOUR FROM timestamp)::integer % 2) * INTERVAL '1 hour' AS timestamp,
        AVG(temperature) AS temperature,
        AVG(relative_humidity) AS relative_humidity,
        AVG(voc) AS voc,
        AVG(nox) AS nox,
        AVG(pm1) AS pm1,
        AVG(pm25) AS pm25,
        AVG(pm4) AS pm4,
        AVG(pm10) AS pm10
      FROM sen55
      WHERE 
        temperature != 0 OR
        relative_humidity != 0 OR
        voc != 0 OR
        nox != 0 OR
        pm1 != 0 OR
        pm25 != 0 OR
        pm4 != 0 OR
        pm10 != 0
      GROUP BY date_trunc('hour', timestamp) - 
        (EXTRACT(HOUR FROM timestamp)::integer % 2) * INTERVAL '1 hour'
      ORDER BY timestamp DESC
    `

    const result = await client.query(query)
    client.release()
    console.log(`Query executed. Returned ${result.rows.length} rows.`)

    return result.rows
  } catch (err) {
    console.error('Error executing query', err)
    return { error: 'Internal server error', details: err.message }
  }
})
