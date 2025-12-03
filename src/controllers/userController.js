const User = require('../models/User');
const ResponseHelper = require('../utils/responseHelper');

class UserController {
  // Save FCM token
  async saveFCMToken(req, res) {
    try {
      const { fcm_token } = req.body;
      const user = req.user;

      if (!fcm_token) {
        return res.status(400).json(
          ResponseHelper.error('FCM token is required', null, 0)
        );
      }

      // Update or upsert FCM token (idempotent)
      await user.update({ fcm_token });

      res.json(
        ResponseHelper.success(null, 'FCM token saved successfully', 0)
      );
    } catch (error) {
      console.error('Save FCM token error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to save FCM token', error.message, 0)
      );
    }
  }
}

module.exports = new UserController();

