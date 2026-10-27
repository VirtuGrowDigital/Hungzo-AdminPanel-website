import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  LayoutTemplate,
  Send,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationTargetingPicker from '../../Components/LocationTargetingPicker';
import { emptyTargeting, isGlobalTargeting } from '../../Api/multicity';
import { useAuth } from '../../Context/AuthProvider';
import { createNotificationCampaign } from '../../Api';

const audienceOptions = [
  {
    value: 'PUSH_ENABLED_USERS',
    label: 'Users with push enabled',
    hint: 'Best for campaigns where delivery metrics matter most.',
    icon: BellRing,
  },
  {
    value: 'ALL_USERS',
    label: 'All active users',
    hint: 'Also stores the campaign inside the app inbox for broader reach.',
    icon: Users,
  },
];

const actionOptions = [
  {
    value: 'OPEN_NOTIFICATIONS',
    label: 'Open notifications inbox',
    hint: 'Send customers straight to their in-app inbox.',
    icon: BellRing,
  },
  {
    value: 'OPEN_URL',
    label: 'Open promotional URL',
    hint: 'Drive traffic to a landing page, banner, or external promotion.',
    icon: ExternalLink,
  },
  {
    value: 'OPEN_WALLET',
    label: 'Open wallet',
    hint: 'Useful for balance, cashback, and payment-led campaigns.',
    icon: Wallet,
  },
];

const baseFieldClassName =
  'mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100';

const SendNotification = ({ onSent }) => {
  const [audienceType, setAudienceType] = useState('PUSH_ENABLED_USERS');
  const [targeting, setTargeting] = useState(emptyTargeting());
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionType, setActionType] = useState('OPEN_NOTIFICATIONS');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('Open app');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewImage = useMemo(() => imageUrl.trim(), [imageUrl]);
  const selectedAudience = useMemo(
    () => audienceOptions.find((option) => option.value === audienceType),
    [audienceType]
  );
  const selectedAction = useMemo(
    () => actionOptions.find((option) => option.value === actionType),
    [actionType]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    if (actionType === 'OPEN_URL' && !actionUrl.trim()) {
      toast.error('Please enter the promotional URL');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isGlobalTargeting(targeting) && user?.role !== 'SUPERADMIN') {
        toast.error('Select at least one location for this campaign');
        setIsSubmitting(false);
        return;
      }

      const result = await createNotificationCampaign({
        title: title.trim(),
        body: message.trim(),
        audienceType,
        // Only users with an address in (or whose last order was in) these
        // locations receive the push.
        targeting,
        actionType,
        actionLabel: actionLabel.trim() || 'Open app',
        actionUrl: actionType === 'OPEN_URL' ? actionUrl.trim() : '',
        imageUrl: imageUrl.trim(),
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success('Promotional notification sent');
      setTitle('');
      setMessage('');
      setImageUrl('');
      setActionType('OPEN_NOTIFICATIONS');
      setActionUrl('');
      setActionLabel('Open app');
      onSent?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-0 xl:grid-cols-[1.2fr,0.8fr]">
      <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">
                <Sparkles className="h-3.5 w-3.5" />
                Compose
              </div>
              <h2 className="mt-2.5 text-xl font-semibold text-slate-900">
                Build a notification campaign
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-500">
                Delivery uses the backend Firebase Admin SDK and every campaign is also saved
                to the user inbox for in-app visibility.
              </p>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>

          <div className="mt-5">
            <LocationTargetingPicker
              value={targeting}
              onChange={setTargeting}
              role={user?.role}
              description="Only users with a saved address in these locations (or whose last order was there) receive this push. A Gwalior sale blasted to Lucknow burns trust."
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <section className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2.5 text-cyan-700 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Choose your audience</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Target only reachable push users or broaden visibility with inbox delivery.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
              {audienceOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = audienceType === option.value;

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-[1.15rem] border p-3.5 transition ${
                      isSelected
                        ? 'border-cyan-200 bg-white shadow-sm ring-2 ring-cyan-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setAudienceType(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`rounded-xl p-2 ${
                              isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-500">{option.hint}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Campaign content</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Keep copy concise and action-oriented so the push is readable at a glance.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Notification title
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={baseFieldClassName}
                  placeholder="Weekend deals are live"
                  maxLength={140}
                />
                <span className="mt-2 block text-right text-xs text-slate-400">{title.length}/140</span>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Notification message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className={`${baseFieldClassName} resize-none`}
                  placeholder="Fresh grocery offers are waiting. Tap to explore today's promo picks."
                  maxLength={500}
                />
                <span className="mt-2 block text-right text-xs text-slate-400">{message.length}/500</span>
              </label>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Visual boost</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Add a public HTTPS image if you want richer Android push rendering and a more
                  compelling inbox card.
                </p>
              </div>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Optional image URL
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={baseFieldClassName}
                placeholder="https://cdn.example.com/promo-banner.jpg"
              />
            </label>
          </section>

          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Tap behavior</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Choose where customers land after they tap the notification.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 lg:grid-cols-3">
              {actionOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = actionType === option.value;

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-[1.15rem] border p-3.5 transition ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setActionType(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`rounded-2xl p-2 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-500">{option.hint}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                CTA label
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  className={baseFieldClassName}
                  placeholder="Shop now"
                  maxLength={40}
                />
              </label>

              {actionType === 'OPEN_URL' ? (
                <label className="block text-sm font-medium text-slate-700">
                  Promotional URL
                  <input
                    type="url"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className={baseFieldClassName}
                    placeholder="https://example.com/offers"
                  />
                </label>
              ) : (
                <div className="rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500">
                  Customers will stay inside the app after tapping this notification.
                </div>
              )}
            </div>
          </section>
        </form>
      </div>

      <aside className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-5 text-white">
        <div className="sticky top-0 space-y-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  Live preview
                </div>
                <h3 className="mt-1.5 text-base font-semibold">Customer notification</h3>
              </div>
              <BellRing className="h-5 w-5 text-cyan-200" />
            </div>

            <div className="mt-4 rounded-[1.15rem] bg-white p-3.5 text-slate-900 shadow-xl">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span>Hungzo</span>
                <span>Now</span>
              </div>
              <div className="mt-3 text-sm font-semibold">
                {title.trim() || 'Weekend deals are live'}
              </div>
              <div className="mt-1.5 text-sm leading-5 text-slate-600">
                {message.trim() ||
                  "Fresh grocery offers are waiting. Tap to explore today's promo picks."}
              </div>
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Notification preview"
                  className="mt-3 h-28 w-full rounded-[1rem] object-cover"
                />
              ) : (
                <div className="mt-3 flex h-28 items-center justify-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                  Image preview will appear here
                </div>
              )}
              <div className="mt-3 inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                {actionLabel.trim() || 'Open app'}
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-3.5">
              <div className="text-xs text-slate-200">Audience</div>
              <div className="mt-1.5 text-base font-semibold text-white">
                {selectedAudience?.label || 'Users with push enabled'}
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-3.5">
              <div className="text-xs text-slate-200">Destination</div>
              <div className="mt-1.5 text-base font-semibold text-white">
                {selectedAction?.label || 'Open notifications inbox'}
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-3.5">
              <div className="text-xs text-slate-200">Delivery path</div>
              <div className="mt-1.5 text-base font-semibold text-white">Push + in-app inbox</div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-400/20 p-2">
                <Check className="h-4 w-4" />
              </div>
              <p className="leading-5">
                Every campaign is recorded for history tracking, including delivery counts,
                failures, and open performance when available.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SendNotification;
