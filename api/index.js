/**
 * Vercel Serverless Function Handler
 */
const handleRequest = require('../server');

module.exports = async (req, res) => {
  return handleRequest(req, res);
};
