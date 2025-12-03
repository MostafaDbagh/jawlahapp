const Notification = require('../models/Notification');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class NotificationController {
  // Get notifications with pagination and filtering
  async getNotifications(req, res) {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 per page
      const type = req.query.type; // Optional: 'order', 'system', 'offers', 'other'

      // Validate type if provided
      const validTypes = ['order', 'system', 'offers', 'other'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json(
          ResponseHelper.error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`, null, 0)
        );
      }

      // Build where clause
      const whereClause = {
        user_id: user.user_id
      };

      if (type) {
        whereClause.type = type;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Fetch notifications (newest first)
      const { count, rows } = await Notification.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json(
        ResponseHelper.success({
          notifications: rows,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: count,
            itemsPerPage: limit,
            hasNextPage,
            hasPrevPage
          }
        }, 'Notifications retrieved successfully', rows.length)
      );
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to retrieve notifications', error.message, 0)
      );
    }
  }

  // Mark notification as read (optional future scope)
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const notification = await Notification.findOne({
        where: {
          notification_id: id,
          user_id: user.user_id
        }
      });

      if (!notification) {
        return res.status(404).json(
          ResponseHelper.error('Notification not found', null, 0)
        );
      }

      await notification.update({ is_read: true });

      res.json(
        ResponseHelper.success({
          notification
        }, 'Notification marked as read', 1)
      );
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to mark notification as read', error.message, 0)
      );
    }
  }
}

module.exports = new NotificationController();

