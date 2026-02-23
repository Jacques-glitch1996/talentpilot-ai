import { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="tp-page-header">
      <div>
        <h1 className="tp-h1">{title}</h1>
        {subtitle ? <p className="tp-subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div className="tp-page-header__right">{right}</div> : null}
    </div>
  );
}
