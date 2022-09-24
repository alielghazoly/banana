module.exports = (error, req, res, next) => {
    const status = error.statusCode || 500;
    const state = error.state || 0;
    const message = error.message;
    res.status(status).json({ state: state, message: message });
}