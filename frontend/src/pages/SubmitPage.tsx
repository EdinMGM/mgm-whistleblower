import ReportForm from '../components/ReportForm';
import { useLocation } from 'react-router-dom';

/**
 * Zajednička stranica za podnošenje prijave.
 * Određuje vrstu prijave (GENERAL/SENSITIVE) na osnovu rute.
 */
export default function SubmitPage() {
  const location = useLocation();
  const isSensitive = location.pathname === '/prijavi-osjetljivu';

  return (
    <ReportForm
      reportType={isSensitive ? 'SENSITIVE' : 'GENERAL'}
      title={isSensitive
        ? 'Prijava o direktoru ili Compliance Officer-u'
        : 'Prijava neusklađenosti u organizaciji'}
      description={isSensitive
        ? 'Prijavite neusklađenosti koje se odnose na direktora kompanije ili Compliance Officer-a. Obavijest se šalje direktno pravnom odjelu. Ove prijave su dostupne samo izričito ovlaštenim osobama.'
        : 'Prijavite nepravilnosti u radu kompanije. Obavijest se šalje na adresu za neusklađenosti. Vaš identitet ostaje nepoznat.'}
    />
  );
}
