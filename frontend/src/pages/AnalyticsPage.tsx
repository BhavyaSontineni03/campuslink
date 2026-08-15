import { motion } from 'framer-motion';
import { BarChart3, TrendingDown, LogIn, Radio, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFunnelAnalytics, useBanditSnapshot } from '../hooks/useAnalyticsFunnel';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const STAGE_LABELS: Record<string, string> = {
  viewed: 'Viewed',
  opened: 'Opened',
  started_registration: 'Started registration',
  completed_registration: 'Completed registration',
  attended: 'Attended',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  in_app_push: 'In-app push',
  sms: 'SMS',
};

const barColors = ['bg-primary-400', 'bg-primary-500', 'bg-mint-500', 'bg-peach-400', 'bg-lavender-400'];

const AnalyticsPage = () => {
  const { currentUser, isAuthenticated } = useAppStore();
  const canViewAnalytics = isAuthenticated && ['organizer', 'admin', 'super_admin'].includes(currentUser?.role ?? '');

  const { data: funnel, isLoading: funnelLoading } = useFunnelAnalytics(canViewAnalytics);
  const { data: bandit, isLoading: banditLoading } = useBanditSnapshot(canViewAnalytics);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <LogIn className="h-10 w-10 text-ink-soft mx-auto mb-4" />
        <h3 className="font-display text-xl text-ink mb-2">Sign in required</h3>
        <p className="section-copy mx-auto mb-6">
          Sign in to view conversion analytics and personalization insights.
        </p>
        <Link to="/login" className="btn-primary inline-flex">
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  if (!canViewAnalytics) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-ink-soft mx-auto mb-4" />
        <h3 className="font-display text-xl text-ink mb-2">Organizer access required</h3>
        <p className="section-copy mx-auto">
          Conversion analytics are available to organizers and admins so they can see where
          registration flows lose people.
        </p>
      </div>
    );
  }

  const stages = funnel?.stages ?? [];
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const dropOff = funnel?.biggest_dropoff ?? null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="section-title">Conversion funnel</h1>
        <p className="section-copy mt-2">
          How students move from viewing a session to actually showing up, and where the biggest drop-off happens.
        </p>
      </motion.div>

      {/* Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="surface p-6 sm:p-8"
      >
        <h2 className="font-display text-lg text-ink mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-600" />
          Stage by stage
        </h2>

        {funnelLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-primary-100 rounded-xl" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-10">
            <p className="section-copy mx-auto">
              Funnel data will appear here once there is enough tracked activity to report on.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const widthPercentage = Math.max(4, (stage.count / maxCount) * 100);
              const isDropOffStart = dropOff?.from === stage.stage;
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-semibold text-ink">{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
                    <span className="text-ink-muted">
                      {stage.count.toLocaleString()}
                      {stage.conversion_from_previous !== null && (
                        <span className="ml-2 text-ink-soft">
                          ({Math.round(stage.conversion_from_previous * 100)}% of previous stage)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-primary-50 rounded-full h-3">
                    <div
                      className={cn('h-3 rounded-full transition-all duration-500', barColors[index % barColors.length])}
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>
                  {isDropOffStart && dropOff && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-warning-600">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {Math.round(dropOff.drop_pct)}% drop to the next stage
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dropOff && (
          <div className="mt-6 surface-muted p-4 sm:p-5">
            <p className="text-sm text-ink">
              <span className="font-semibold">
                Biggest drop-off: {STAGE_LABELS[dropOff.from]} to {STAGE_LABELS[dropOff.to]}
              </span>{' '}
              ({Math.round(dropOff.drop_pct)}% lost).{' '}
              {funnel?.reminder_timing_is_top_lever
                ? 'This is the gap between registering and showing up, which usually points to reminder timing rather than interest. Sending a nudge closer to the session start time tends to recover a meaningful share of this drop.'
                : 'Worth investigating what happens at this step in the flow.'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Bandit snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="surface p-6 sm:p-8"
      >
        <h2 className="font-display text-lg text-ink mb-6 flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary-600" />
          Reminder-timing bandit snapshot
        </h2>

        {banditLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-primary-100 rounded-lg" />
            ))}
          </div>
        ) : !bandit || bandit.length === 0 ? (
          <p className="section-copy mx-auto text-center py-6">
            No bandit snapshot available yet. This will populate once reminders have gone out and
            attendance outcomes have been reconciled.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-primary-100">
                  <th className="py-2 pr-4 font-medium">Channel</th>
                  <th className="py-2 pr-4 font-medium">Reminder offset</th>
                  <th className="py-2 pr-4 font-medium">Trials</th>
                  <th className="py-2 font-medium">Attendance rate</th>
                </tr>
              </thead>
              <tbody>
                {bandit.map((arm) => (
                  <tr key={`${arm.channel}-${arm.offset_minutes}`} className="border-b border-primary-50 last:border-0">
                    <td className="py-2.5 pr-4 text-ink font-medium">{CHANNEL_LABELS[arm.channel] ?? arm.channel}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{arm.offset_minutes} min before</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{Math.max(0, Math.round(arm.total_trials))}</td>
                    <td className="py-2.5 text-ink-muted">{(arm.mean * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;
