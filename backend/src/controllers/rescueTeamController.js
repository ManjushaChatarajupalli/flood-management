// =============================================================
// RESCUE TEAM CONTROLLER — Fixed with members + area support
// =============================================================

const RescueTeam = require('../models/RescueTeam');
const User = require('../models/User');

class RescueTeamController {

  // ─────────────────────────────────────────────────────────
  // POST /rescue-teams  —  admin only
  // FIX: accepts memberIds[] array + area field
  // ─────────────────────────────────────────────────────────
  async createTeam(req, res) {
    try {
      const { teamName, teamLeaderId, memberIds = [], area = '' } = req.body;

      // ── Validate required fields ──
      if (!teamName || !teamName.trim()) {
        return res.status(400).json({ message: 'Team name is required' });
      }
      if (!teamLeaderId) {
        return res.status(400).json({ message: 'Team leader is required' });
      }

      // ── Verify team leader exists and has rescue_team role ──
      const leader = await User.findByPk(teamLeaderId);
      if (!leader || leader.role !== 'rescue_team') {
        return res.status(400).json({ message: 'Invalid team leader — must be a rescue team member' });
      }

      // ── Validate all member IDs exist ──
      let validatedMemberIds = [];
      if (memberIds.length > 0) {
        const members = await User.findAll({
          where: { id: memberIds, role: 'rescue_team' }
        });
        validatedMemberIds = members.map(m => m.id);

        // Warn if some IDs were invalid but don't block
        if (validatedMemberIds.length !== memberIds.length) {
          console.warn('Some member IDs were invalid or not rescue_team role — skipped');
        }
      }

      // ── Ensure leader is always included in members ──
      if (!validatedMemberIds.includes(parseInt(teamLeaderId))) {
        validatedMemberIds.unshift(parseInt(teamLeaderId));
      }

      // ── Create team ──
      const team = await RescueTeam.create({
        teamName:    teamName.trim(),
        teamLeaderId: parseInt(teamLeaderId),
        memberIds:   validatedMemberIds,
        memberCount: validatedMemberIds.length,
        area:        area.trim(),
        status:      'available',
        isActive:    true,
      });

      // ── Broadcast new team to all clients ──
      const io = req.app.get('io');
      if (io) {
        io.emit('team_created', { teamId: team.id, teamName: team.teamName });
      }

      return res.status(201).json({
        success: true,
        message: `Rescue team "${team.teamName}" created successfully`,
        team,
      });

    } catch (error) {
      console.error('createTeam error:', error);
      return res.status(500).json({
        message: 'Failed to create team',
        error: error.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /rescue-teams  —  public
  // ─────────────────────────────────────────────────────────
  async getAllTeams(req, res) {
    try {
      const { status } = req.query;
      const where = { isActive: true };
      if (status) where.status = status;

      const teams = await RescueTeam.findAll({
        where,
        include: [{
          model: User,
          as: 'teamLeader',
          attributes: ['id', 'name', 'email', 'phone'],
        }],
        order: [['teamName', 'ASC']],
      });

      return res.status(200).json({
        success: true,
        count: teams.length,
        teams,
      });

    } catch (error) {
      console.error('getAllTeams error:', error);
      return res.status(500).json({
        message: 'Failed to fetch teams',
        error: error.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /rescue-teams/:id  —  public
  // ─────────────────────────────────────────────────────────
  async getTeamById(req, res) {
    try {
      const team = await RescueTeam.findByPk(req.params.id, {
        include: [{
          model: User,
          as: 'teamLeader',
          attributes: ['id', 'name', 'email', 'phone'],
        }],
      });

      if (!team) return res.status(404).json({ message: 'Team not found' });

      return res.status(200).json({ success: true, team });

    } catch (error) {
      console.error('getTeamById error:', error);
      return res.status(500).json({ message: 'Failed to fetch team', error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // PUT /rescue-teams/:id/location  —  rescue_team, admin
  // ─────────────────────────────────────────────────────────
  async updateTeamLocation(req, res) {
    try {
      const { latitude, longitude } = req.body;
      const team = await RescueTeam.findByPk(req.params.id);
      if (!team) return res.status(404).json({ message: 'Team not found' });

      await team.update({
        currentLatitude:    parseFloat(latitude),
        currentLongitude:   parseFloat(longitude),
        lastLocationUpdate: new Date(),
      });

      const io = req.app.get('io');
      if (io) io.emit('team_location_updated', {
        teamId:    req.params.id,
        latitude:  team.currentLatitude,
        longitude: team.currentLongitude,
      });

      return res.status(200).json({ success: true, message: 'Location updated', team });

    } catch (error) {
      console.error('updateTeamLocation error:', error);
      return res.status(500).json({ message: 'Failed to update location', error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // PUT /rescue-teams/:id/status  —  rescue_team, admin
  // ─────────────────────────────────────────────────────────
  async updateTeamStatus(req, res) {
    try {
      const { status, currentIncidentId } = req.body;
      const team = await RescueTeam.findByPk(req.params.id);
      if (!team) return res.status(404).json({ message: 'Team not found' });

      const updateData = { status };
      if (currentIncidentId !== undefined) updateData.currentIncidentId = currentIncidentId;

      await team.update(updateData);

      const io = req.app.get('io');
      if (io) io.emit('team_status_updated', { teamId: req.params.id, status: team.status });

      return res.status(200).json({ success: true, message: 'Status updated', team });

    } catch (error) {
      console.error('updateTeamStatus error:', error);
      return res.status(500).json({ message: 'Failed to update status', error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /rescue-teams/members/available  —  admin only
  // Returns all users with rescue_team role (for the create form dropdown)
  // ─────────────────────────────────────────────────────────
  async getAvailableMembers(req, res) {
    try {
      const members = await User.findAll({
        where: { role: 'rescue_team' },
        attributes: ['id', 'name', 'email', 'phone'],
        order: [['name', 'ASC']],
      });

      return res.status(200).json({ success: true, members });

    } catch (error) {
      console.error('getAvailableMembers error:', error);
      return res.status(500).json({ message: 'Failed to fetch members', error: error.message });
    }
  }
}

module.exports = new RescueTeamController();