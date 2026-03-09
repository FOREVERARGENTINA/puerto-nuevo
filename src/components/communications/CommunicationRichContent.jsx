import { sanitizeCommunicationHtml } from '../../utils/communicationRichText';
import './CommunicationRichContent.css';

export function CommunicationRichContent({
  body,
  bodyRich,
  className = '',
  compact = false,
}) {
  const richHtml = sanitizeCommunicationHtml(bodyRich);
  const classes = [
    'communication-rich-content',
    compact ? 'communication-rich-content--compact' : '',
    !richHtml ? 'communication-rich-content--plain' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (richHtml) {
    return <div className={classes} dangerouslySetInnerHTML={{ __html: richHtml }} />;
  }

  return <div className={classes}>{body || ''}</div>;
}
