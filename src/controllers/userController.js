const User = require('../models/User');
const ResponseHelper = require('../utils/responseHelper');

class UserController {
  // Save FCM token (accepts fcm_token or firebase_token from mobile clients)
  async saveFCMToken(req, res) {
    try {
      const fcm_token = String(
        req.body.fcm_token || req.body.firebase_token || ''
      ).trim();
      const user = req.user;

      if (!fcm_token) {
        return res.status(400).json(
          ResponseHelper.error('FCM token is required', null, 0)
        );
      }

      const metadata = { ...(user.metadata || {}) };
      const device = {
        device_type: req.body.device_type,
        device_name: req.body.device_name,
        device_id: req.body.device_id,
        device_model: req.body.device_model,
        device_manufacturer: req.body.device_manufacturer,
        app_version: req.body.app_version,
        build_number: req.body.build_number,
        app_language: req.body.app_language,
        platform_version: req.body.platform_version
      };
      const hasDevice = Object.values(device).some((v) => v != null && v !== '');
      if (hasDevice) {
        metadata.last_push_device = {
          ...(metadata.last_push_device || {}),
          ...Object.fromEntries(
            Object.entries(device).filter(([, v]) => v != null && v !== '')
          ),
          updated_at: new Date().toISOString()
        };
      }

      await user.update(
        hasDevice ? { fcm_token, metadata } : { fcm_token }
      );

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

