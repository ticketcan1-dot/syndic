export function Notice({
  message,
  error,
}: {
  message?: string;
  error?: boolean;
}) {
  return (
    <>
      {error && (
        <div role="alert" className="notice">
          Les données sont temporairement indisponibles. Vérifiez la connexion
          et l’installation de la migration SyndiConnect.
        </div>
      )}
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
    </>
  );
}
