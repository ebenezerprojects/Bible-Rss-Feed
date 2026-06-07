function handleError(res, error, statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    });
}

function formatResponse(data, success = true, message = null) {
    const response = { success };
    if (message) response.message = message;
    response.data = data;
    response.timestamp = new Date().toISOString();
    return response;
}

module.exports = { handleError, formatResponse };