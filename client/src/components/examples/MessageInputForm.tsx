import MessageInputForm from '../MessageInputForm';

export default function MessageInputFormExample() {
  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  return <MessageInputForm onSubmit={handleSubmit} />;
}
