import PropTypes from 'prop-types';

export default function Console({ output, running, aiLoading, formatting, cleared }) {
  const isEmpty   = !output;
  const isLoading = running || aiLoading || formatting;
  const isError   = !isLoading && output && (
    output.startsWith('Error') ||
    output.startsWith('AI Error') ||
    output.startsWith('Format Error') ||
    output.includes('ERROR:')
  );
  const isSuccess = !isLoading && !isError && !isEmpty;

  const dotClass = isError   ? 'console-dot dot-error'
                 : isLoading ? 'console-dot dot-loading'
                 : 'console-dot';

  const outputClass = isEmpty   ? 'console-output output-empty'
                    : isError   ? 'console-output output-error'
                    : isLoading ? 'console-output output-loading'
                    : isSuccess ? 'console-output output-success'
                    : 'console-output';

  const label = isLoading ? 'Processing...'
              : isError   ? 'Error'
              : isEmpty   ? 'Output'
              : 'Output';

  return (
    <div className="console">
      <div className="console-header panel-header">
        <span className="panel-title">
          <span className={dotClass}></span>
          {label}
        </span>
        <span className="panel-badge">
          {isLoading ? 'Running' : isError ? 'Failed' : isEmpty ? 'Idle' : 'Done'}
        </span>
      </div>
      <pre className={outputClass}>
        {cleared ? '' : output || 'Run code, Format, or Ask AI to see output here...'}
      </pre>
    </div>
  );
}

Console.propTypes = {
  output:     PropTypes.string,
  running:    PropTypes.bool,
  aiLoading:  PropTypes.bool,
  formatting: PropTypes.bool,
  cleared:    PropTypes.bool,
};
