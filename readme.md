❤️**Acesse aqui:**

[Cronograma](https://baccarinha.github.io/cronograma/)


Projeto de Escala de Frente de Caixa

O projeto Gerenciamento de Escala da Frente de Caixa é um sistema web desenvolvido para organizar e controlar escalas de trabalho de funcionários, especialmente voltado para ambientes como supermercados ou lojas com múltiplos setores. O sistema funciona como um painel administrativo (dashboard) que permite cadastrar colaboradores, definir horários, organizar folgas e gerar cronogramas de forma estruturada e visual.

Acesso

O site está disponível em 

baccarinha.github.io/cronograma. É uma aplicação estática: basta abrir o endereço no navegador.

Funcionalidades disponíveis

Painel e funcionários

•
O painel apresenta cartões de resumo e busca de funcionários.

•
O cadastro de funcionário inclui nome, setor, horário, folga semanal e ciclo de domingo.

•
Na aba Funcionários, a ação Editar folgas permite mudar a folga semanal e o ciclo dominical.

•
A ação Excluir remove um funcionário da lista após confirmação. Cronogramas já gerados mantêm o retrato dos dados usado quando foram criados.

Folgas de domingo

Ciclo
Regra
A
Folga em domingos alternados, iniciando em 04/01/2026.
B
Folga nos domingos alternados opostos ao ciclo A, iniciando em 11/01/2026.
C
Trabalha todos os domingos.
D
Folga todos os domingos.




A folga semanal é configurada separadamente e pode ser de segunda a sexta-feira ou Nenhum dia de semana. A mudança de folgas afeta cronogramas criados depois da alteração, não os registros históricos.

Cronogramas e PDF

•
Cria cronogramas com nome e uma data escolhida no calendário.

•
Calcula quem está trabalhando ou de folga naquela data e organiza a visualização por setor.

•
Permite visualizar os detalhes, abrir a prévia de PDF e baixar o cronograma em PDF.

•
Permite excluir cronogramas com confirmação.

Setores

O sistema começa com cinco setores: Caixa, Auto Atendimento, Carrinhos, Assistentes e Fiscal. É possível editar o nome, a cor, o ícone e a descrição dos setores existentes.

Relógio

O cabeçalho mostra dia, data e horário de Brasília. O horário é obtido pela internet por meio da API 

Time.now, atualizado na tela a cada segundo e sincronizado novamente a cada minuto. Se a conexão falhar, a aplicação usa o horário do dispositivo ou a última sincronização recebida.

Como usar

1.
Abra a aba Funcionários e selecione Adicionar Funcionário.

2.
Informe os dados e escolha separadamente a folga semanal e o ciclo de domingo.

3.
No cartão do funcionário, use Editar folgas para alterar esses dois campos ou Excluir para removê-lo após confirmar.

4.
Abra Cronogramas, selecione Novo Cronograma, informe um nome e escolha a data no calendário.

5.
Em Cronogramas, selecione Visualizar para conferir a escala e gerar o PDF.

6.
Em Setores, edite as informações visuais dos setores disponíveis.

Dados e limitações desta versão

Os dados são armazenados no localStorage do navegador (fortEmployees, fortSchedules e fortSectors). Eles não são sincronizados automaticamente entre dispositivos, navegadores ou perfis diferentes. Limpar os dados do navegador pode apagá-los.

Embora apareçam na interface, os botões Exportar Dados e Importar Dados não têm rotinas correspondentes implementadas no código atual; não os utilize como único meio de backup ou recuperação.

Também não há, nesta versão, formulário para editar nome, setor ou horário de um funcionário, nem para editar um cronograma depois de criado. As opções existentes permitem editar as folgas e excluir funcionários ou cronogramas.

Tecnologias e arquivos

•
HTML, CSS e JavaScript — interface e regras da aplicação.

•
Font Awesome — ícones; jsPDF e html2canvas — prévia e geração de PDF.

•
localStorage — persistência local no navegador.

•
GitHub Pages — hospedagem estática.

•
Time.now — fonte externa de horário.

Arquivo
Responsabilidade
index.html
Estrutura da página, formulários e modais.
style.css
Estilos e adaptação visual.
script.js
Funcionários, folgas, setores, cronogramas, PDF e relógio.
readme.md
Esta documentação.
.github/workflows/deploy.yml
Fluxo de publicação do site.
