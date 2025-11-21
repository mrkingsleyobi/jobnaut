// User routes for JobNaut
// Handles user profile related endpoints

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authMiddleware } = require('../auth/middleware');
const userProfileService = require('../services/userProfile');
const securityLogger = require('../services/securityLogger');

const router = express.Router();

/**
 * GET /user/profile
 * Get current user's profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await userProfileService.getProfile(req.user.id);
    res.json({ profile });
  } catch (error) {
    securityLogger.logSecurityIncident('profile_fetch_error', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
    });
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /user/profile
 * Update current user's profile
 */
router.put(
  '/profile',
  [
    authMiddleware,
    body('name').isLength({ min: 1, max: 100 }).trim().escape().optional({ nullable: true }),
    body('location').isLength({ max: 100 }).trim().escape().optional({ nullable: true }),
    body('experienceLevel').isIn(['entry', 'mid', 'senior', 'lead']).optional({ nullable: true }),
    body('skills').isArray().optional({ nullable: true }),
    body('skills.*').isString().trim().escape().optional({ nullable: true }),
  ],
  async (req, res) => {
    // Log the profile update attempt
    securityLogger.logDataAccess('user_profile_update', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logSuspiciousActivity('profile_update_validation_error', {
        userId: req.user.id,
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profileData = req.body;
      const updatedProfile = await userProfileService.updateProfile(req.user.id, profileData);
      res.json({ profile: updatedProfile });
    } catch (error) {
      securityLogger.logSecurityIncident('profile_update_error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      console.error('Error updating user profile:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error.message === 'Skills must be an array') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * POST /user/skills
 * Add skills to user's profile
 */
router.post(
  '/skills',
  [
    authMiddleware,
    body('skills').isArray({ min: 1, max: 50 }),
    body('skills.*').isString().trim().escape().isLength({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    // Log the skills add attempt
    securityLogger.logDataAccess('user_skills_add', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      skillsCount: req.body.skills ? req.body.skills.length : 0,
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logSuspiciousActivity('skills_add_validation_error', {
        userId: req.user.id,
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { skills } = req.body;

      const updatedProfile = await userProfileService.addSkills(req.user.id, skills);
      res.json({ profile: updatedProfile });
    } catch (error) {
      securityLogger.logSecurityIncident('skills_add_error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      console.error('Error adding skills:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Failed to add skills' });
    }
  }
);

/**
 * DELETE /user/skills
 * Remove skills from user's profile
 */
router.delete(
  '/skills',
  [
    authMiddleware,
    body('skills').isArray({ min: 1, max: 50 }),
    body('skills.*').isString().trim().escape().isLength({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    // Log the skills remove attempt
    securityLogger.logDataAccess('user_skills_remove', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      skillsCount: req.body.skills ? req.body.skills.length : 0,
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logSuspiciousActivity('skills_remove_validation_error', {
        userId: req.user.id,
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { skills } = req.body;

      const updatedProfile = await userProfileService.removeSkills(req.user.id, skills);
      res.json({ profile: updatedProfile });
    } catch (error) {
      securityLogger.logSecurityIncident('skills_remove_error', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      console.error('Error removing skills:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Failed to remove skills' });
    }
  }
);

module.exports = router;
