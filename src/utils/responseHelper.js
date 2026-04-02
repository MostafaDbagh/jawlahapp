/**
 * Standardized API Response Helper
 * Format: {status: boolean, data: dynamic, message: string, count: number}
 *
 * Supports two styles:
 * - Legacy: build a plain object (used with res.json(ResponseHelper.success(...)))
 * - Express: ResponseHelper.list(res, data, count, message) sends the response
 */

function isExpressResponse(obj) {
  return obj != null && typeof obj.status === 'function' && typeof obj.json === 'function';
}

class ResponseHelper {
  /**
   * Success response (legacy object OR Express sender)
   * Legacy: success(data, message, count?)
   * Express: success(res, data, message)
   */
  static success(first, second, third) {
    if (isExpressResponse(first)) {
      const res = first;
      const data = second;
      const message = third ?? 'Success';
      const count =
        data == null
          ? 0
          : Array.isArray(data)
            ? data.length
            : 1;
      return res.status(200).json({
        status: true,
        data,
        message,
        count
      });
    }

    const response = {
      status: true,
      data: first,
      message: second ?? 'Success'
    };
    if (third !== null && third !== undefined) {
      response.count = third;
    }
    return response;
  }

  /**
   * Error response (legacy object OR Express sender)
   * Legacy: error(message, data?, count?)
   * Express: error(res, message, httpStatus?)
   */
  static error(first, second, third) {
    if (isExpressResponse(first)) {
      const res = first;
      const message = second ?? 'Error occurred';
      const statusCode = typeof third === 'number' ? third : 500;
      return res.status(statusCode).json({
        status: false,
        data: null,
        message,
        count: 0
      });
    }

    const response = {
      status: false,
      data: second ?? null,
      message: first ?? 'Error occurred'
    };
    if (third !== null && third !== undefined) {
      response.count = third;
    }
    return response;
  }

  /**
   * List response
   * Legacy: list(data, message?) — plain object
   * Express: list(res, data, count, message)
   */
  static list(first, second, third, fourth) {
    if (isExpressResponse(first)) {
      const res = first;
      const data = second ?? [];
      const count =
        third !== undefined && third !== null
          ? Number(third)
          : Array.isArray(data)
            ? data.length
            : 0;
      const message = fourth ?? 'Data retrieved successfully';
      return res.status(200).json({
        status: true,
        data,
        message,
        count
      });
    }

    const data = first ?? [];
    const message = second ?? 'Data retrieved successfully';
    return {
      status: true,
      data,
      message,
      count: Array.isArray(data) ? data.length : 0
    };
  }

  /**
   * Single item response
   * Legacy: item(data, message?)
   * Express: item(res, data, message, statusCode?)
   */
  static item(first, second, third, fourth) {
    if (isExpressResponse(first)) {
      const res = first;
      const data = second;
      const message = third ?? 'Item retrieved successfully';
      const statusCode = typeof fourth === 'number' ? fourth : 200;
      return res.status(statusCode).json({
        status: true,
        data,
        message,
        count: data != null ? 1 : 0
      });
    }

    return {
      status: true,
      data: first,
      message: second ?? 'Item retrieved successfully',
      count: first != null ? 1 : 0
    };
  }

  /**
   * Empty response (legacy only)
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
