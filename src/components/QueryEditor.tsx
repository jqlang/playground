import EditorWrapper from './EditorWrapper';

interface QueryEditorProps {
  value?: string;
  handleChange: (value: string | undefined) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ value, handleChange }) => {
  return (
    <EditorWrapper title="Query" language="plaintext" value={value} handleChange={handleChange} />
  );
}

export default QueryEditor;
