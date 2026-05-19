import React, { useState } from 'react';
import { ImagePlus, LayoutPanelTop, PanelsTopLeft } from 'lucide-react';
import BannerList from './BannerList';
import AddBanner from './AddBanner';
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

const Banner = () => {
  const [activeView, setActiveView] = useState('add'); // 'list' or 'add'

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Visual Campaigns"
        title="Banner Management"
        description="Keep promotional artwork organized with one place to publish, review, and refresh the customer-facing banner stack."
        icon={PanelsTopLeft}
        meta={activeView === 'list' ? 'Reviewing live banner library' : 'Creating a new banner'}
      />

      <AdminTabs
        tabs={[
          { id: 'list', label: 'View Posters', icon: LayoutPanelTop },
          { id: 'add', label: 'Add New Poster', icon: ImagePlus },
        ]}
        activeKey={activeView}
        onChange={setActiveView}
      />

      <AdminPanel>
        {activeView === 'list' ? <BannerList /> : <AddBanner onBack={() => setActiveView('list')} />}
      </AdminPanel>
    </AdminPage>
  );
};

export default Banner;
