import React, { useState } from 'react';
import { BellRing, History, Send } from 'lucide-react';
import SendNotification from './SendNotification';
import HistoryNotification from './HistoryNotification';
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

const tabs = [
  {
    id: 'send',
    label: 'Compose Campaign',
    description: 'Build and send a promotional push campaign.',
    icon: Send,
  },
  {
    id: 'history',
    label: 'Campaign History',
    description: 'Review delivery outcomes and recent performance.',
    icon: History,
  },
];

const Notification = () => {
  const [activeView, setActiveView] = useState('send');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Engagement"
        title="Notifications"
        description="Compose concise campaigns and review recent delivery activity from one focused workspace."
        icon={BellRing}
        meta={activeView === 'send' ? 'Campaign composer open' : 'History view active'}
        accent="cyan"
      />

      <AdminTabs tabs={tabs} activeKey={activeView} onChange={setActiveView} />

      <AdminPanel>
        <div className="overflow-hidden">
          {activeView === 'send' ? (
            <SendNotification
              onSent={() => {
                setRefreshKey((value) => value + 1);
                setActiveView('history');
              }}
            />
          ) : (
            <HistoryNotification refreshKey={refreshKey} />
          )}
        </div>
      </AdminPanel>
    </AdminPage>
  );
};

export default Notification;
