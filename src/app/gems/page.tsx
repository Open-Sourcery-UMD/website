import { PageContainer, SectionContainer } from "@components/Container";

const Gems = () => {
  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-white text-5xl md:text-7xl font-bold mb-4">Gems</h1>
        <p className="text-zinc-400 text-xl mb-16 max-w-2xl">
          Two ways to earn gems; semesterly winners get prizes.
        </p>
      </SectionContainer>
    </PageContainer>
  )
}

export default Gems;