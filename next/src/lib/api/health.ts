/**
 * Health check API client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface HealthCheckResponse {
  message: string
}

/**
 * Perform health check on the backend API
 * @returns Promise with health check response
 * @throws Error if health check fails
 */
export const checkHealth = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Health check error:', error)
    throw error
  }
}
