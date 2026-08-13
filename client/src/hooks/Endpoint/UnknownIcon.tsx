import { memo } from 'react';
import { EModelEndpoint, KnownEndpoints } from '@hanzochat/data-provider';
import { CustomMinimalIcon, XAIcon, MoonshotIcon } from '@hanzochat/client';
import ZenLogoIcon from '~/components/svg/ZenLogoIcon';
import EnsoLogoIcon from '~/components/svg/EnsoLogoIcon';
import { IconContext } from '~/common';
import { cn, isEnso } from '~/utils';

const knownEndpointAssets = {
  [KnownEndpoints.anyscale]: 'assets/anyscale.png',
  [KnownEndpoints.apipie]: 'assets/apipie.png',
  [KnownEndpoints.cohere]: 'assets/cohere.png',
  [KnownEndpoints.deepseek]: 'assets/deepseek.svg',
  [KnownEndpoints.fireworks]: 'assets/fireworks.png',
  [KnownEndpoints.google]: 'assets/google.svg',
  [KnownEndpoints.groq]: 'assets/groq.png',
  [KnownEndpoints.helicone]: 'assets/helicone.png',
  [KnownEndpoints.huggingface]: 'assets/huggingface.svg',
  [KnownEndpoints.mistral]: 'assets/mistral.png',
  [KnownEndpoints.mlx]: 'assets/mlx.png',
  [KnownEndpoints.ollama]: 'assets/ollama.png',
  [KnownEndpoints.openai]: 'assets/openai.svg',
  [KnownEndpoints.openrouter]: 'assets/openrouter.png',
  [KnownEndpoints.perplexity]: 'assets/perplexity.png',
  [KnownEndpoints.qwen]: 'assets/qwen.svg',
  [KnownEndpoints.shuttleai]: 'assets/shuttleai.png',
  [KnownEndpoints['together.ai']]: 'assets/together.png',
  [KnownEndpoints.unify]: 'assets/unify.webp',
  // Hanzo's custom provider families are matched by their lowercased endpoint
  // NAME (the KnownEndpoints enum lacks qwen/google/openai keys, so those fall
  // through). Gives each family its real provider mark in the model picker.
  qwen: 'assets/qwen.svg',
  'google gemma': 'assets/google.svg',
  'openai gpt-oss': 'assets/openai.svg',
};

const knownEndpointClasses = {
  [KnownEndpoints.cohere]: {
    [IconContext.landing]: 'p-2',
  },
};

const getKnownClass = ({
  currentEndpoint,
  context = '',
  className,
}: {
  currentEndpoint: string;
  context?: string;
  className: string;
}) => {
  if (currentEndpoint === KnownEndpoints.openrouter) {
    return className;
  }

  const match = knownEndpointClasses[currentEndpoint]?.[context] ?? '';
  const defaultClass = context === IconContext.landing ? '' : className;

  return cn(match, defaultClass);
};

function UnknownIcon({
  className = '',
  endpoint: _endpoint,
  model,
  iconURL = '',
  context,
}: {
  iconURL?: string;
  className?: string;
  endpoint?: EModelEndpoint | string | null;
  /** The selected model. The Hanzo endpoint serves two makers' families, so the
   *  endpoint alone cannot choose a mark — see the branch below. */
  model?: string | null;
  context?: 'landing' | 'menu-item' | 'nav' | 'message';
}) {
  const endpoint = _endpoint ?? '';
  if (!endpoint) {
    return <CustomMinimalIcon className={className} />;
  }

  const currentEndpoint = endpoint.toLowerCase();

  // Hanzo's endpoint serves two makers' families, so the endpoint does not pick
  // the mark — the MODEL does. Enso is Hanzo's, drawn as the closed ensō; Zen is
  // Zoo Labs Foundation's and wears Zoo's mark. Getting this wrong renders one
  // maker's model under the other's identity.
  //
  // This read the endpoint alone and always answered Zen, so every Enso row in
  // the model menu wore Zen's mark while the message avatar beside it (which has
  // always asked `isEnso`) wore Enso's. One predicate now, imported from
  // ~/utils, so the two surfaces cannot disagree again.
  if (currentEndpoint === 'hanzo' || currentEndpoint === 'zen') {
    return isEnso(model) ? (
      <EnsoLogoIcon className={cn(className, 'text-black dark:text-white')} />
    ) : (
      <ZenLogoIcon className={cn(className, 'text-black dark:text-white')} />
    );
  }

  if (currentEndpoint === KnownEndpoints.xai) {
    return <XAIcon className={cn(className, 'text-black dark:text-white')} />;
  }

  if (currentEndpoint === KnownEndpoints.moonshot) {
    return <MoonshotIcon className={cn(className, 'text-black dark:text-white')} />;
  }

  if (iconURL) {
    return <img className={className} src={iconURL} alt={`${endpoint} Icon`} />;
  }

  const assetPath: string = knownEndpointAssets[currentEndpoint] ?? '';

  if (!assetPath) {
    return <CustomMinimalIcon className={className} />;
  }

  return (
    <img
      className={getKnownClass({
        currentEndpoint,
        context: context,
        className,
      })}
      src={assetPath}
      alt={`${currentEndpoint} Icon`}
    />
  );
}

export default memo(UnknownIcon);
