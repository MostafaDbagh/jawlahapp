/**
 * Standardized API Response Helper
 * Format: {status: boolean, data: dynamic, message: string, count: number}
 */

class ResponseHelper {
  /**
   * Success response
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {number} count - Number of items (optional)
   * @returns {Object} Standardized response
   */
  static success(data = null, message = 'Success', count = null) {
    const response = {
      status: true,
      data,
      message
    };

    if (count !== null) {
      response.count = count;
    }

    return response;
  }

  /**
   * Error response
   * @param {string} message - Error message
   * @param {any} data - Error data (optional)
   * @param {number} count - Number of items (optional)
   * @returns {Object} Standardized response
   */
  static error(message = 'Error occurred', data = null, count = null) {
    const response = {
      status: false,
      data,
      message
    };

    if (count !== null) {
      response.count = count;
    }

    return response;
  }

  /**
   * List response with count
   * @param {Array} data - Array of items
   * @param {string} message - Success message
   * @returns {Object} Standardized response with count
   */
  static list(data = [], message = 'Data retrieved successfully') {
    return {
      status: true,
      data,
      message,
      count: Array.isArray(data) ? data.length : 0
    };
  }

  /**
   * Single item response
   * @param {any} data - Single item
   * @param {string} message - Success message
   * @returns {Object} Standardized response
   */
  static item(data = null, message = 'Item retrieved successfully') {
    return {
      status: true,
      data,
      message,
      count: data ? 1 : 0
    };
  }

  /**
   * Empty response
   * @param {string} message - Message
   * @returns {Object} Standardized response
   */
  static empty(message = 'No data found') {
    return {
      status: true,
      data: null,
      message,
      count: 0
    };
  }
}

module.exports = ResponseHelper;
