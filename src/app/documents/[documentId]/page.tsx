interface DocuementIdPageProps {
    params:Promise<{documentId: string}>;
};

const DocumentIdPage = async({ params }: DocuementIdPageProps) => {
    const awaitedParams = await params;
    const documentId = awaitedParams.documentId;
    return ( 
        <div>Document ID: {documentId}</div>
     );
}
 
export default DocumentIdPage;