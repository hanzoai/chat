import React, { memo } from 'react';
import { getEndpointField } from '@hanzochat/data-provider';
import type { TModelSpec, TEndpointsConfig } from '@hanzochat/data-provider';
import type { IconMapProps } from '~/common';
import { getModelSpecIconURL, getIconKey } from '~/utils';
import { URLIcon } from '~/components/Endpoints/URLIcon';
import { icons } from '~/hooks/Endpoint/Icons';

interface SpecIconProps {
  currentSpec: TModelSpec;
  endpointsConfig: TEndpointsConfig;
}

type IconType = (props: IconMapProps) => React.JSX.Element;

const SpecIcon: React.FC<SpecIconProps> = ({ currentSpec, endpointsConfig }) => {
  const iconURL = getModelSpecIconURL(currentSpec);
  const endpoint = currentSpec.preset?.endpoint;
  const endpointIconURL = getEndpointField(endpointsConfig, endpoint, 'iconURL');
  const iconKey = getIconKey({ endpoint, endpointsConfig, endpointIconURL });
  // A picture or a name — nothing else. `/assets/clickhouse-logo.svg` is a
  // picture we serve ourselves, and the test used to be `includes('http')`,
  // which reads a same-origin path as a name and looks it up among the built-in
  // icons: every self-hosted spec logo silently became the unknown glyph. It
  // also matched any name that merely CONTAINED "http".
  if (/^(https?:\/\/|\/|data:)/.test(iconURL)) {
    return (
      <URLIcon
        iconURL={iconURL}
        altName={currentSpec.name}
        containerStyle={{ width: 20, height: 20 }}
        className="icon-md shrink-0 overflow-hidden rounded-full"
        endpoint={endpoint || undefined}
      />
    );
  }

  const Icon = (icons[iconURL] ?? icons[iconKey] ?? icons.unknown) as IconType;

  return (
    <Icon
      size={20}
      endpoint={endpoint}
      context="menu-item"
      iconURL={endpointIconURL}
      className="icon-md shrink-0 text-text-primary"
    />
  );
};

export default memo(SpecIcon);
