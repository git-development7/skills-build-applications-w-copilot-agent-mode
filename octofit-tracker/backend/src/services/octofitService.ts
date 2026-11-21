import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Valid activity data is required');

  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  if (
    typeof userId !== 'string'
    || typeof teamId !== 'string'
    || typeof type !== 'string'
    || type.trim().length === 0
    || typeof minutes !== 'number'
    || !Number.isFinite(minutes)
    || minutes <= 0
  ) {
    throw badRequest('Valid userId, teamId, type, and minutes are required');
  }

  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId)) {
    throw badRequest('Activity references must contain valid IDs');
  }

  const [user, team] = await Promise.all([
    User.findById(userId),
    Team.findById(teamId),
  ]);
  if (!user || !team) throw badRequest('Activity user and team must exist');

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  const input = _input as { name?: unknown; mascot?: unknown; members?: unknown } | null;
  if (!input || typeof input !== 'object') throw badRequest('Valid team data is required');
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw badRequest('Team name is required');
  }
  if (typeof input.mascot !== 'string' || input.mascot.trim().length === 0) {
    throw badRequest('Team mascot is required');
  }

  const memberIds = input.members ?? [];
  if (!Array.isArray(memberIds) || memberIds.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    throw badRequest('Team members must contain valid IDs');
  }

  if (memberIds.length > 0) {
    const members = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
    if (members.length !== memberIds.length) throw badRequest('Team members must exist');
  }

  return Team.create({
    name: input.name.trim(),
    mascot: input.mascot.trim(),
    members: memberIds,
  });
}

export async function getLeaderboard() {
  const teams = await Team.find().lean();
  const activities = await Activity.find().lean();
  const totals = new Map<string, number>();
  for (const activity of activities) {
    const teamId = activity.team.toString();
    totals.set(teamId, (totals.get(teamId) ?? 0) + activity.points);
  }

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: totals.get(team._id.toString()) ?? 0,
    }))
    .filter((entry) => entry.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityFocus = recentActivity?.type === 'run'
    ? 'endurance'
    : recentActivity?.type === 'strength'
      ? 'strength'
      : undefined;
  const focus = user.fitnessGoal || activityFocus;

  const workouts = await Workout.find().lean();
  const matching = workouts.filter((workout) => workout.focus === focus);
  const remaining = workouts.filter((workout) => workout.focus !== focus);
  const reason = focus === 'strength'
    ? 'Recommended for your strength activity and fitness goal'
    : focus === 'endurance'
      ? 'Recommended for your run activity and endurance goal'
      : 'Recommended for your recent activity';

  return [...matching, ...remaining].map((workout) => ({ ...workout, reason }));
}

export { User };
